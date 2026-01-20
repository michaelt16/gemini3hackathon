/**
 * API Route for extracting clean photos from camera frames
 * Uses the same processScannedPhoto function that works in the playground
 */

import { NextRequest, NextResponse } from 'next/server';
import { processScannedPhoto } from '@/lib/image-processor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    console.log('🖼️ Processing photo with Nano Banana...');
    
    // Use the same function that works in the playground
    const result = await processScannedPhoto(imageBase64);

    // Determine quality based on description
    let quality = 'acceptable';
    let method = 'smart-crop';
    
    if (result.description?.includes('Nano Banana')) {
      quality = 'excellent';
      method = 'gemini-image';
    } else if (result.description?.includes('extracted, straightened')) {
      quality = 'good';
      method = 'perspective-correct';
    } else if (result.description?.includes('cropped')) {
      quality = 'acceptable';
      method = 'smart-crop';
    }

    return NextResponse.json({
      success: true,
      imageBase64: `data:${result.mimeType};base64,${result.imageBase64}`,
      quality: quality,
      method: method,
    });
  } catch (error: any) {
    console.error('Photo extraction error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Extraction failed' 
    }, { status: 500 });
  }
}
