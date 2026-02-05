/**
 * API Route for quick draft photo extraction
 * Uses bounding box detection + cropping (fast, no heavy AI)
 * User can upgrade to Nano Banana later via /api/nano-banana
 */

import { NextRequest, NextResponse } from 'next/server';
import { processDraftPhoto } from '@/lib/image-processor';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      console.log('❌ [extract-photo] No image provided in request');
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    console.log('');
    console.log('📋 ════════════════════════════════════════════════════════');
    console.log('📋 [extract-photo] DRAFT EXTRACTION');
    console.log('📋 ════════════════════════════════════════════════════════');
    console.log('📋 [extract-photo] Input size:', Math.round(imageBase64.length / 1024), 'KB');
    
    const result = await processDraftPhoto(imageBase64);

    // Determine method from description
    let quality = 'draft';
    let method = 'bbox-crop';
    
    if (result.description?.includes('center-cropped')) {
      method = 'center-crop';
    } else if (result.description?.includes('no crop')) {
      method = 'original';
      quality = 'original';
    }

    const elapsed = Date.now() - startTime;
    console.log('');
    console.log('📋 ════════════════════════════════════════════════════════');
    console.log(`📋 [extract-photo] COMPLETED in ${elapsed}ms`);
    console.log(`📋 [extract-photo] Method: ${method} | Quality: ${quality}`);
    console.log('📋 [extract-photo] Output size:', Math.round(result.imageBase64.length / 1024), 'KB');
    console.log('📋 ════════════════════════════════════════════════════════');
    console.log('');

    return NextResponse.json({
      success: true,
      imageBase64: `data:${result.mimeType};base64,${result.imageBase64}`,
      quality: quality,
      method: method,
      isDraft: true,
      description: result.description,
      processingTimeMs: elapsed,
    });
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error('');
    console.error('📋 ════════════════════════════════════════════════════════');
    console.error(`📋 [extract-photo] FAILED after ${elapsed}ms`);
    console.error('📋 [extract-photo] Error:', error?.message || error);
    console.error('📋 ════════════════════════════════════════════════════════');
    console.error('');
    
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Draft extraction failed' 
    }, { status: 500 });
  }
}
