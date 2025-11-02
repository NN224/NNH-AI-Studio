import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * NOTE: Google My Business v4 Media API has been deprecated/discontinued by Google.
 * This endpoint is kept for reference but will return a deprecation notice.
 * 
 * Media upload is still available through Business Information API when creating posts:
 * - Use Business Information API v1: /locations/{locationId}/localPosts
 * - Include media in the post payload using sourceUrl
 * 
 * Example usage:
 *   POST /api/gmb/posts/publish
 *   {
 *     "postId": "...",
 *     "media_url": "https://example.com/image.jpg"
 *   }
 */
export async function GET(request: NextRequest) {
  // Return deprecation notice
  return NextResponse.json({
    deprecated: true,
    message: 'Google My Business v4 Media API has been discontinued by Google.',
    alternative: {
      description: 'Media can be uploaded through Business Information API when creating posts',
      api: 'Business Information API v1',
      endpoint: 'POST /locations/{locationId}/localPosts',
      method: 'Include media in the post payload using sourceUrl',
      example: {
        endpoint: '/api/gmb/posts/publish',
        payload: {
          postId: 'your-post-id',
          media_url: 'https://example.com/image.jpg'
        }
      }
    },
    currentImplementation: {
      location: 'app/api/gmb/posts/publish/route.ts',
      note: 'Media is included in posts via payload.media with sourceUrl'
    },
    documentation: 'https://developers.google.com/my-business/content/basic-information',
    timestamp: new Date().toISOString(),
  }, { status: 410 }); // 410 Gone - indicates resource is no longer available
}
