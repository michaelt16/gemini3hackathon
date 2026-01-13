import { NextRequest, NextResponse } from 'next/server';
import { analyzePhoto } from '@/lib/gemini';
import { PhotoAnalysis } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const analysis: PhotoAnalysis = await analyzePhoto(
      base64Data,
      mimeType || 'image/jpeg'
    );

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Photo analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze photo' },
      { status: 500 }
    );
  }
}
