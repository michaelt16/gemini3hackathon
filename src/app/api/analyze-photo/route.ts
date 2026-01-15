import { NextRequest, NextResponse } from 'next/server';
import { analyzePhoto, askAboutImage } from '@/lib/gemini';
import { PhotoAnalysis } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, image, mimeType, prompt } = body;

    // Support both 'imageBase64' and 'image' field names
    const imageData = imageBase64 || image;

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

    // If a custom prompt is provided, use the generic image query
    if (prompt) {
      const response = await askAboutImage(base64Data, prompt, mimeType || 'image/jpeg');
      return NextResponse.json({ response });
    }

    // Otherwise, do standard photo analysis
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
