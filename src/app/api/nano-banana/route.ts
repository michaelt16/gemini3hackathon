/**
 * API Route for Nano Banana extraction
 * Converts a draft photo to a clean full-frame extracted version
 * Uses the new @google/genai SDK with gemini-3-pro-image-preview
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      console.log('❌ [nano-banana] No image provided in request');
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      console.log('❌ [nano-banana] GEMINI_API_KEY not configured');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    console.log('');
    console.log('🍌 ════════════════════════════════════════════════════════');
    console.log('🍌 [nano-banana] API CALLED - Full Extraction');
    console.log('🍌 ════════════════════════════════════════════════════════');
    console.log('🍌 [nano-banana] Input size:', Math.round(imageBase64.length / 1024), 'KB');
    
    // Clean the base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const prompt = `Look at this image of someone holding a physical photograph. 
Extract ONLY the photograph content and generate a clean, full-frame version of just the photo.

Remove completely:
- All hands, fingers, thumbs holding the photo
- All background (table, surface, wall, etc.)
- The photo's frame or border edges
- Any reflections or glare

Output a clean image that contains ONLY the photograph's content.
Make it look like a professional digital scan.
Straighten the image if it's tilted.
Fill the entire output with just the photo content.`;

    // Initialize the new SDK
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    // Models to try in order (newest first)
    const modelsToTry = [
      'gemini-3-pro-image-preview',
      'gemini-2.0-flash-preview-image-generation',
      'gemini-2.0-flash-exp',
    ];

    for (const modelName of modelsToTry) {
      try {
        console.log(`🍌 [nano-banana] Trying model: ${modelName}`);
        
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          config: {
            responseModalities: ['IMAGE', 'TEXT'],
          },
        });

        const candidates = response.candidates || [];
        console.log(`🍌 [nano-banana] ${modelName} - candidates:`, candidates.length);

        if (candidates.length === 0) {
          console.log(`🍌 [nano-banana] ${modelName} - no candidates, trying next model...`);
          continue;
        }

        const parts = candidates[0]?.content?.parts || [];
        console.log(`🍌 [nano-banana] ${modelName} - parts:`, parts.length);

        // Look for image in response
        for (const part of parts) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            const elapsed = Date.now() - startTime;
            const outputBase64 = part.inlineData.data;
            
            console.log('');
            console.log('🍌 ════════════════════════════════════════════════════════');
            console.log('🍌 [nano-banana] MODEL USED:', modelName);
            console.log(`🍌 [nano-banana] ✅ SUCCESS in ${elapsed}ms`);
            console.log('🍌 [nano-banana] Output size:', Math.round((outputBase64?.length || 0) / 1024), 'KB');
            console.log('🍌 ════════════════════════════════════════════════════════');
            console.log('');

            return NextResponse.json({
              success: true,
              imageBase64: outputBase64,
              mimeType: part.inlineData.mimeType,
              description: `Full-frame photo extracted with ${modelName}`,
              processingTimeMs: elapsed,
              model: modelName,
            });
          }
        }

        // Got text instead of image
        const textParts = parts.filter((p: any) => p.text);
        if (textParts.length > 0) {
          console.log(`🍌 [nano-banana] ${modelName} returned text instead of image:`, textParts[0].text?.substring(0, 200));
        }
        
      } catch (modelError: any) {
        console.log(`🍌 [nano-banana] ${modelName} failed:`, modelError?.message);
        // Continue to next model
      }
    }

    // All models failed
    console.log('🍌 [nano-banana] ⚠️ All models failed. Tried:', modelsToTry.join(', '));
    
    return NextResponse.json({ 
      success: false, 
      error: 'All image generation models failed. This feature may be temporarily unavailable.',
      details: 'Tried: ' + modelsToTry.join(', ')
    }, { status: 500 });

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error('');
    console.error('🍌 ════════════════════════════════════════════════════════');
    console.error(`🍌 [nano-banana] FAILED after ${elapsed}ms`);
    console.error('🍌 [nano-banana] Error:', error?.message || error);
    console.error('🍌 [nano-banana] Stack:', error?.stack);
    console.error('🍌 ════════════════════════════════════════════════════════');
    console.error('');
    
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Nano Banana extraction failed' 
    }, { status: 500 });
  }
}
