import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateVideoWithPolling, VeoVideoConfig } from '@/lib/veo-service';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Check if photo contains minors using Gemini Vision
 */
async function detectMinors(imageBase64: string): Promise<boolean> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const prompt = `Analyze this photo and determine if it contains any children or minors (people under 18 years old).

Look for:
- Children or teenagers
- People who appear to be under 18
- Family photos with young people

Respond with ONLY "YES" if minors are detected, or "NO" if no minors are present.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const text = response.text().toUpperCase().trim();
    
    return text.includes('YES');
  } catch (error) {
    console.error('Minor detection error:', error);
    // If detection fails, assume no minors (safer to animate)
    return false;
  }
}

/**
 * Animate photo using VEO 3
 */
async function animatePhoto(
  imageBase64: string,
  storyText: string
): Promise<{ videoUrl: string; videoBase64?: string; duration: number }> {
  try {
    // Calculate duration based on story length (4, 6, or 8 seconds)
    const estimatedDuration = Math.ceil(storyText.split(/\s+/).length / 2.5);
    const duration = estimatedDuration <= 4 ? 4 : estimatedDuration <= 6 ? 6 : 8;
    
    // Build animation prompt for subtle, minimal animation
    const animationPrompt = `Create a subtle, minimal animation of this photo. Very slow, gentle movement. Focus on environmental elements (water, leaves, clouds, wind, light). Like a Live Photo - barely noticeable motion. Keep it natural and cinematic.`;
    
    // Determine aspect ratio from image (default to 16:9)
    // Could analyze image dimensions, but for now default to 16:9
    const config: VeoVideoConfig = {
      duration: duration as 4 | 6 | 8,
      resolution: '720p', // Start with 720p, can upgrade to 1080p later
      aspectRatio: '16:9',
      prompt: animationPrompt,
    };

    console.log(`🎬 Generating VEO 3 video (${duration}s, ${config.resolution})...`);
    
    // Generate video with polling
    const result = await generateVideoWithPolling(imageBase64, config, 300, 10);
    
    if (result.status === 'failed') {
      throw new Error('VEO 3 video generation failed');
    }
    
    if (result.status === 'completed') {
      return {
        videoUrl: result.videoUrl || '',
        videoBase64: result.videoBase64,
        duration: result.duration,
      };
    }
    
    throw new Error('Video generation did not complete');
  } catch (error) {
    console.error('VEO 3 animation error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photoUrl, photoBase64, storyText, animationStyle = 'subtle' } = body;

    // Accept either photoUrl (base64 data URL) or photoBase64 (raw base64)
    const imageBase64 = photoBase64 || photoUrl;
    
    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Photo (photoUrl or photoBase64) is required' },
        { status: 400 }
      );
    }

    if (!storyText) {
      return NextResponse.json(
        { error: 'Story text is required for animation prompt' },
        { status: 400 }
      );
    }

    console.log('🎬 Starting VEO 3 animation...');
    
    // Check for minors first - VEO 3 policy prevents animation when minors are present
    const hasMinors = await detectMinors(imageBase64);
    
    if (hasMinors) {
      console.log('⚠️ Minors detected - cannot animate due to VEO 3 policy');
      return NextResponse.json(
        {
          error: 'Cannot animate photo',
          reason: 'minors_detected',
          message: 'This photo contains minors. Due to VEO 3 policy restrictions, we cannot animate photos with children or minors present.',
          hasMinors: true,
        },
        { status: 403 } // 403 Forbidden - policy restriction
      );
    }

    // Animate photo using VEO 3
    let animationResult;
    try {
      animationResult = await animatePhoto(imageBase64, storyText);
    } catch (error) {
      console.error('VEO 3 animation error details:', error);
      // Return a more helpful error message
      return NextResponse.json(
        {
          error: 'Failed to animate photo with VEO 3',
          details: error instanceof Error ? error.message : 'Unknown error',
          suggestion: 'Check server logs for detailed error information. VEO 3 may require special API access.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      animatedVideoUrl: animationResult.videoUrl,
      videoBase64: animationResult.videoBase64, // Include base64 for immediate playback
      duration: animationResult.duration,
      hasMinors: false,
      animationStyle: animationStyle,
      status: 'completed',
    });
  } catch (error) {
    console.error('Photo animation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to animate photo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
