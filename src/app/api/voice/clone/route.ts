import { NextRequest, NextResponse } from 'next/server';
import { cloneVoice } from '@/lib/voice-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audioFile') as File;
    const voiceName = formData.get('voiceName') as string || 'My Voice';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Clone voice
    const voiceProfile = await cloneVoice(buffer, voiceName);

    return NextResponse.json({
      success: true,
      voiceProfile,
    });
  } catch (error) {
    console.error('Voice cloning error:', error);
    return NextResponse.json(
      {
        error: 'Failed to clone voice',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
