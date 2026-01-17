import { NextRequest, NextResponse } from 'next/server';
import { processScannedPhoto } from '@/lib/image-processor';

/**
 * Process a scanned photo: crop to just the photo and enhance quality
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'imageBase64 is required' },
        { status: 400 }
      );
    }

    console.log('🖼️ Processing scanned photo...');
    
    const result = await processScannedPhoto(imageBase64);
    
    console.log('✅ Photo processed successfully');
    
    return NextResponse.json({
      success: true,
      processedImage: `data:${result.mimeType};base64,${result.imageBase64}`,
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
      description: result.description,
    });
  } catch (error) {
    console.error('Photo processing error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process photo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
