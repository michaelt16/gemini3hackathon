import { NextRequest, NextResponse } from 'next/server';
import { generateTTS, generateTTSGoogle } from '@/lib/voice-service';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    return false;
  }
}

/**
 * Create animated story: Combine TTS audio + animated video
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      photoId,
      storyId,
      storyText,
      voiceId,
      photoUrl,
    } = body;

    if (!photoId || !storyText || !voiceId || !photoUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: photoId, storyText, voiceId, photoUrl' },
        { status: 400 }
      );
    }

    console.log('Creating animated story:', { photoId, storyId, voiceId });

    // Step 1: Generate TTS audio
    console.log('Step 1: Generating TTS audio...');
    let audioBuffer: Buffer;
    let audioDuration: number;
    
    try {
      // Check if using Google TTS (free) or ElevenLabs
      if (voiceId === 'google') {
        audioBuffer = await generateTTSGoogle(storyText);
      } else {
        audioBuffer = await generateTTS(storyText, voiceId);
      }
      
      const wordCount = storyText.split(/\s+/).length;
      audioDuration = Math.ceil(wordCount / 2.5);
      
      console.log(`TTS generated: ${audioDuration}s audio (${voiceId === 'google' ? 'Google TTS' : 'ElevenLabs'})`);
    } catch (error) {
      console.error('TTS generation failed:', error);
      return NextResponse.json(
        {
          error: 'Failed to generate TTS audio',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Step 2: Check for minors and animate photo
    console.log('Step 2: Checking for minors and animating photo...');
    const hasMinors = await detectMinors(photoUrl);
    
    // Call animation endpoint (or inline the logic)
    const animateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/animate-photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoUrl,
        storyText,
        animationStyle: hasMinors ? 'environment-only' : 'subtle',
      }),
    });

    if (!animateResponse.ok) {
      throw new Error('Failed to animate photo');
    }

    const animationData = await animateResponse.json();
    const { animatedVideoUrl, duration: videoDuration } = animationData;

    // Step 3: Combine audio + video (mocked for now)
    // TODO: Use FFmpeg or video processing library to combine
    // For now, return both separately
    console.log('Step 3: Combining audio and video...');
    
    // Convert audio to base64
    const audioBase64 = audioBuffer.toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

    // In production, you would:
    // 1. Download animated video from VEO 3
    // 2. Use FFmpeg to combine audio + video
    // 3. Upload final video to storage
    // 4. Return final video URL

    const animatedStory = {
      id: `animated-story-${Date.now()}`,
      photoId,
      storyId,
      animatedVideoUrl,
      audioUrl: audioDataUrl,
      audioBase64,
      duration: Math.max(audioDuration, videoDuration),
      voiceId,
      hasMinors,
      createdAt: Date.now(),
      status: 'completed', // Will be 'processing' during actual video combination
    };

    return NextResponse.json({
      success: true,
      animatedStory,
    });
  } catch (error) {
    console.error('Create animated story error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create animated story',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
