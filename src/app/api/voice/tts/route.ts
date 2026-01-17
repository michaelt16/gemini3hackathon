import { NextRequest, NextResponse } from 'next/server';
import { generateTTS, generateTTSGoogle } from '@/lib/voice-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId, options, useGoogle = false } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Generate TTS audio
    let audioBuffer: Buffer;
    
    // Use Google TTS if voiceId is 'google' or useGoogle is true
    if (voiceId === 'google' || useGoogle) {
      if (!process.env.GOOGLE_CLOUD_API_KEY) {
        return NextResponse.json(
          { error: 'GOOGLE_CLOUD_API_KEY not configured. Add it to .env.local or use ElevenLabs.' },
          { status: 400 }
        );
      }
      audioBuffer = await generateTTSGoogle(text, options?.voiceName);
    } else {
      if (!voiceId) {
        return NextResponse.json(
          { error: 'voiceId is required (or set useGoogle: true for free Google TTS)' },
          { status: 400 }
        );
      }
      audioBuffer = await generateTTS(text, voiceId, options || {});
    }

    // Convert to base64 for response
    const base64Audio = audioBuffer.toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    // Estimate duration (rough: ~150 words per minute, ~2.5 words per second)
    const wordCount = text.split(/\s+/).length;
    const estimatedDuration = Math.ceil(wordCount / 2.5);

    return NextResponse.json({
      success: true,
      audioUrl: audioDataUrl,
      audioBase64: base64Audio,
      duration: estimatedDuration,
      wordCount,
    });
  } catch (error) {
    console.error('TTS generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate TTS',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
