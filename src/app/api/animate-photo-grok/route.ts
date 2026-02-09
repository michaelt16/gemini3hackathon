import { NextRequest, NextResponse } from 'next/server';
import { generateGrokVideoWithPolling, GrokVideoConfig } from '@/lib/grok-imagine-service';
import { buildAnimationPrompt } from '@/lib/animation-styles';

/**
 * POST /api/animate-photo-grok
 * Animate a photo using Grok Imagine (xAI)
 * Alternative to VEO 3 - works with photos containing minors
 */
export async function POST(request: NextRequest) {
  // Check for API key first
  if (!process.env.XAI_API_KEY) {
    console.error('🎬 [Grok Imagine] XAI_API_KEY is not configured');
    return NextResponse.json(
      { error: 'Grok Imagine API is not configured. Please add XAI_API_KEY to environment variables.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { photoUrl, photoBase64, storyText, duration = 5, animationStyle = 'cinematic' } = body;

    console.log('🎬 [Grok Imagine] Request received. photoUrl:', photoUrl ? 'yes' : 'no', 'photoBase64:', photoBase64 ? 'yes' : 'no');

    // Grok Imagine API requires a publicly accessible URL
    let imageUrl = '';

    // Prefer photoUrl if it's an http(s) URL
    if (photoUrl && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
      imageUrl = photoUrl;
    }

    if (!imageUrl) {
      console.error('🎬 [Grok Imagine] Error: No valid public URL provided');
      return NextResponse.json(
        { error: 'Grok Imagine requires a publicly accessible image URL. The photo must be stored with a public URL (e.g., from Supabase storage).' },
        { status: 400 }
      );
    }

    console.log('🎬 [Grok Imagine] Starting animation with URL:', imageUrl.substring(0, 100));

    // Build style-specific animation prompt
    const animationPrompt = buildAnimationPrompt(animationStyle, storyText || undefined);

    const config: GrokVideoConfig = {
      duration: Math.min(Math.max(duration, 1), 15), // Clamp to 1-15 seconds
      resolution: '720p',
      aspectRatio: '16:9',
      prompt: animationPrompt,
    };

    // Generate video with polling
    const result = await generateGrokVideoWithPolling(imageUrl, config, 300, 10);

    if (result.status === 'failed') {
      console.error('🎬 [Grok Imagine] Animation failed:', result.error);
      return NextResponse.json(
        {
          error: 'Failed to animate photo with Grok Imagine',
          details: result.error,
        },
        { status: 500 }
      );
    }

    if (result.status === 'completed' && result.videoUrl) {
      console.log('🎬 [Grok Imagine] Animation complete!');
      
      // Try to download the video and convert to base64 for consistency with VEO 3
      let videoBase64: string | undefined;
      try {
        const videoResponse = await fetch(result.videoUrl);
        if (videoResponse.ok) {
          const videoBuffer = await videoResponse.arrayBuffer();
          videoBase64 = Buffer.from(videoBuffer).toString('base64');
          console.log('🎬 [Grok Imagine] Video downloaded, size:', videoBuffer.byteLength);
        }
      } catch (downloadError) {
        console.error('🎬 [Grok Imagine] Video download error:', downloadError);
        // Continue without base64 - we still have the URL
      }

      return NextResponse.json({
        success: true,
        videoUrl: result.videoUrl,
        videoBase64: videoBase64,
        duration: result.duration,
        provider: 'grok-imagine',
        animationStyle,
        message: 'Photo animated successfully with Grok Imagine',
      });
    }

    return NextResponse.json(
      { error: 'Video generation did not complete' },
      { status: 500 }
    );
  } catch (error) {
    console.error('🎬 [Grok Imagine] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to animate photo' },
      { status: 500 }
    );
  }
}
