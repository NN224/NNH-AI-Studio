import { createClient } from "@/lib/supabase/server";
import { logServerActivity } from "@/server/services/activity";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for large video uploads

async function refreshYouTubeToken(refreshToken: string) {
  const clientId = process.env.YT_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret =
    process.env.YT_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!resp.ok) return null;
  return resp.json() as Promise<{ access_token: string; expires_in?: number }>;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Parse FormData
    const formData = await request.formData();
    const videoFile = formData.get("video") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const tagsStr = formData.get("tags") as string;
    const category = (formData.get("category") as string) || "22"; // Default to People & Blogs
    const language = (formData.get("language") as string) || "en";
    const privacy = (formData.get("privacy") as string) || "private";
    const allowComments = formData.get("allowComments") === "true";
    const allowEmbedding = formData.get("allowEmbedding") === "true";
    const ageRestriction = formData.get("ageRestriction") === "true";
    const scheduledAt = formData.get("scheduledAt") as string | null;
    const thumbnailFile = formData.get("thumbnail") as File | null;

    // Validation
    if (!videoFile) {
      return NextResponse.json(
        { error: "Video file is required" },
        { status: 400 },
      );
    }
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 },
      );
    }

    // Get YouTube token
    const { data: tokenData } = await supabase
      .from("oauth_tokens")
      .select("access_token, refresh_token, token_expires_at")
      .eq("user_id", user.id)
      .eq("provider", "youtube")
      .maybeSingle();

    if (!tokenData)
      return NextResponse.json(
        { error: "YouTube not connected" },
        { status: 400 },
      );

    let accessToken = tokenData.access_token as string | null;
    const isExpired = tokenData.token_expires_at
      ? new Date(tokenData.token_expires_at) < new Date()
      : false;
    if ((!accessToken || isExpired) && tokenData.refresh_token) {
      const refreshed = await refreshYouTubeToken(tokenData.refresh_token);
      if (refreshed?.access_token) {
        accessToken = refreshed.access_token;
        const expiresAt = new Date();
        if (refreshed.expires_in)
          expiresAt.setSeconds(expiresAt.getSeconds() + refreshed.expires_in);
        await supabase
          .from("oauth_tokens")
          .update({
            access_token: accessToken,
            token_expires_at: expiresAt.toISOString(),
          })
          .eq("user_id", user.id)
          .eq("provider", "youtube");
      }
    }

    if (!accessToken)
      return NextResponse.json(
        { error: "Missing YouTube access token" },
        { status: 400 },
      );

    // Parse tags
    let tags: string[] = [];
    try {
      tags = tagsStr ? JSON.parse(tagsStr) : [];
    } catch {
      tags = [];
    }

    // Step 1: Initialize resumable upload session
    const videoMetadata = {
      snippet: {
        title,
        description,
        tags: tags.slice(0, 30), // YouTube allows max 30 tags
        categoryId: category,
        defaultLanguage: language,
      },
      status: {
        privacyStatus: privacy,
        selfDeclaredMadeForKids: false,
        ...(ageRestriction && {
          contentRating: { ytRating: "ytAgeRestricted" },
        }),
      },
    };

    // Initialize resumable upload
    const initResponse = await fetch(
      `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": videoFile.type || "video/*",
          "X-Upload-Content-Length": videoFile.size.toString(),
        },
        body: JSON.stringify(videoMetadata),
      },
    );

    if (!initResponse.ok) {
      const errorData = await initResponse.json();
      console.error("[YouTube Upload] Init error:", errorData);
      return NextResponse.json(
        { error: errorData.error?.message || "Failed to initialize upload" },
        { status: initResponse.status },
      );
    }

    const uploadUrl = initResponse.headers.get("Location");
    if (!uploadUrl) {
      return NextResponse.json(
        { error: "Failed to get upload URL" },
        { status: 500 },
      );
    }

    // Step 2: Upload video file in chunks (resumable upload)
    const fileBuffer = await videoFile.arrayBuffer();
    const fileSize = fileBuffer.byteLength;
    const chunkSize = Math.min(5 * 1024 * 1024, fileSize); // 5MB chunks or file size if smaller

    let uploadedBytes = 0;
    let uploadedVideo: any = null;

    while (uploadedBytes < fileSize) {
      const end = Math.min(uploadedBytes + chunkSize, fileSize);
      const chunk = fileBuffer.slice(uploadedBytes, end);
      const isLastChunk = end >= fileSize;

      const chunkHeaders: Record<string, string> = {
        "Content-Length": (end - uploadedBytes).toString(),
        "Content-Range": `bytes ${uploadedBytes}-${end - 1}/${fileSize}`,
      };

      const chunkResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: chunkHeaders,
        body: chunk,
      });

      if (!chunkResponse.ok) {
        // 308 Resume Incomplete is expected for partial uploads
        if (chunkResponse.status === 308) {
          const rangeHeader = chunkResponse.headers.get("Range");
          if (rangeHeader) {
            // Extract the last uploaded byte from Range header
            const match = rangeHeader.match(/bytes=0-(\d+)/);
            if (match) {
              uploadedBytes = parseInt(match[1]) + 1;
            } else {
              uploadedBytes = end;
            }
          } else {
            uploadedBytes = end;
          }
          continue;
        }

        // Other errors
        const errorData = await chunkResponse
          .text()
          .catch(() => "Unknown error");
        console.error(
          "[YouTube Upload] Chunk error:",
          chunkResponse.status,
          errorData,
        );
        return NextResponse.json(
          { error: `Failed to upload video chunk: ${errorData}` },
          { status: chunkResponse.status },
        );
      }

      // Status 200 means upload complete
      if (chunkResponse.status === 200) {
        uploadedVideo = await chunkResponse.json();
        break;
      }
    }

    if (!uploadedVideo || !uploadedVideo.id) {
      return NextResponse.json(
        { error: "Upload incomplete or failed" },
        { status: 500 },
      );
    }

    // Step 3: Upload thumbnail if provided
    if (thumbnailFile && uploadedVideo.id) {
      try {
        const thumbnailBuffer = await thumbnailFile.arrayBuffer();
        const thumbResponse = await fetch(
          `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${uploadedVideo.id}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": thumbnailFile.type || "image/jpeg",
            },
            body: thumbnailBuffer,
          },
        );
        if (!thumbResponse.ok) {
          console.warn(
            "[YouTube Upload] Thumbnail upload failed, but video uploaded successfully",
          );
        }
      } catch (thumbError) {
        console.error("[YouTube Upload] Thumbnail upload error:", thumbError);
        // Don't fail the whole upload if thumbnail fails
      }
    }

    // Step 4: Save video metadata to database
    try {
      await supabase.from("youtube_videos").insert({
        user_id: user.id,
        video_id: uploadedVideo.id,
        title,
        description,
        tags: tags,
        category: category,
        language: language,
        privacy_status: privacy,
        thumbnail_url: uploadedVideo.snippet?.thumbnails?.default?.url || null,
        published_at:
          uploadedVideo.snippet?.publishedAt || new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    } catch (dbError: any) {
      console.error("[YouTube Upload] Database save error:", dbError);
      // Don't fail if DB save fails, video is already on YouTube
    }

    try {
      await logServerActivity({
        userId: user.id,
        type: "youtube_video_uploaded",
        message: `Uploaded YouTube video ${uploadedVideo.id}`,
        metadata: {
          videoId: uploadedVideo.id,
          privacy,
          hasThumbnail: Boolean(thumbnailFile),
          tagsCount: tags.length,
        },
      });
    } catch {
      // Logging failure should not break the main flow
    }

    return NextResponse.json({
      ok: true,
      message: "Video uploaded successfully",
      videoId: uploadedVideo.id,
      videoUrl: `https://www.youtube.com/watch?v=${uploadedVideo.id}`,
    });
  } catch (e: any) {
    console.error("[YouTube Upload] Error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to upload video" },
      { status: 500 },
    );
  }
}
