"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Send, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useLocations } from "@/hooks/use-locations";

import { usePosts } from "@/hooks/use-posts";

interface GeneratedPost {
  content: string;
  callToAction: string;
  imagePrompt: string;
}

export function PostCreator() {
  const { locations } = useLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  // Initialize selectedLocationId when locations are loaded
  if (!selectedLocationId && locations && locations.length > 0) {
    setSelectedLocationId(locations[0].id);
  }

  const locationId = selectedLocationId || locations?.[0]?.id;
  const { createPost } = usePosts();

  const [intent, setIntent] = useState("");
  const [tone, setTone] = useState("professional");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(
    null,
  );

  const handleGenerate = async () => {
    if (!intent || !locationId) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, intent, tone }),
      });

      if (!response.ok) throw new Error("Failed to generate post");

      const data = await response.json();
      setGeneratedPost(data);
      toast.success("Post generated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate post. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!generatedPost || !locationId) return;

    try {
      await createPost.mutateAsync({
        locationId,
        content: generatedPost.content,
        callToAction: generatedPost.callToAction,
        aiGenerated: true,
        promptUsed: intent,
        tone: tone,
      });
      // Reset after successful publish
      setGeneratedPost(null);
      setIntent("");
    } catch (error) {
      console.error("Failed to publish post:", error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Section */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Post Creator
          </CardTitle>
          {locations && locations.length > 1 && (
            <Select
              value={selectedLocationId}
              onValueChange={setSelectedLocationId}
            >
              <SelectTrigger className="w-[200px] bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">
              What do you want to post about?
            </label>
            <Textarea
              placeholder="e.g., Promote our new summer menu, Announce a holiday sale..."
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="min-h-[120px] bg-zinc-950 border-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Tone</label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual & Friendly</SelectItem>
                <SelectItem value="exciting">Exciting & Urgent</SelectItem>
                <SelectItem value="funny">Funny & Witty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!intent || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Magic...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Post
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {generatedPost ? (
            <div className="space-y-4">
              <div className="aspect-video rounded-lg bg-zinc-800 flex items-center justify-center relative overflow-hidden group">
                <ImageIcon className="w-12 h-12 text-zinc-600" />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-4 text-center text-xs text-zinc-300">
                  Image Prompt: {generatedPost.imagePrompt}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-zinc-200 whitespace-pre-wrap">
                  {generatedPost.content}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-zinc-500">
                    CTA: {generatedPost.callToAction}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handlePublish}
                    disabled={createPost.isPending}
                  >
                    {createPost.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Publish Now
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-zinc-500 space-y-2">
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center">
                <Sparkles className="w-8 h-8 opacity-20" />
              </div>
              <p>Your AI-generated post will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
