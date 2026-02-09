/**
 * API Route for style-transferring a photo before animation.
 * Uses Gemini image generation (same as nano-banana) to transform a photo
 * into a specific art style (Disney, Ghibli, Anime, etc.)
 *
 * Generates 2 preview variants so the user can pick their favorite.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getAnimationStyle } from '@/lib/animation-styles';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

async function generateStylizedImage(
  ai: GoogleGenAI,
  cleanBase64: string,
  prompt: string,
  modelName: string,
): Promise<{ imageBase64: string; mimeType: string } | null> {
  try {
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
    if (candidates.length === 0) return null;

    const parts = candidates[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
        return {
          imageBase64: part.inlineData.data || '',
          mimeType: part.inlineData.mimeType,
        };
      }
    }

    return null;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`🎨 [stylize] ${modelName} failed:`, message);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { imageBase64: rawBase64, photoUrl, photoId, styleId, count = 2 } = body;

    // Accept either base64 or a URL (fetch and convert)
    let imageBase64 = rawBase64 || '';
    if (!imageBase64 && photoUrl) {
      if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
        try {
          const imgRes = await fetch(photoUrl);
          if (imgRes.ok) {
            const buf = await imgRes.arrayBuffer();
            const b64 = Buffer.from(buf).toString('base64');
            const ct = imgRes.headers.get('content-type') || 'image/jpeg';
            imageBase64 = `data:${ct};base64,${b64}`;
          }
        } catch (fetchErr) {
          console.error('🎨 [stylize] Error fetching image URL:', fetchErr);
        }
      } else {
        imageBase64 = photoUrl; // data URL or raw base64
      }
    }

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const style = getAnimationStyle(styleId);
    if (!style.needsStyleTransfer || !style.styleTransferPrompt) {
      return NextResponse.json(
        { error: 'This style does not require style transfer' },
        { status: 400 },
      );
    }

    console.log('');
    console.log('🎨 ════════════════════════════════════════════════════════');
    console.log(`🎨 [stylize] Style: ${style.label} (${style.id})`);
    console.log(`🎨 [stylize] Generating ${count} preview(s)...`);
    console.log('🎨 ════════════════════════════════════════════════════════');

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const modelsToTry = [
      'gemini-3-pro-image-preview',
      'gemini-2.0-flash-preview-image-generation',
      'gemini-2.0-flash-exp',
    ];

    // Generate previews in parallel
    const numPreviews = Math.min(Math.max(count, 1), 4);
    const previews: { imageBase64: string; mimeType: string; model: string }[] = [];

    // Slight prompt variation to get different outputs
    const promptVariants = [
      style.styleTransferPrompt,
      style.styleTransferPrompt + ' Use slightly different color grading and lighting.',
    ];

    for (let i = 0; i < numPreviews; i++) {
      const prompt = promptVariants[i % promptVariants.length];

      for (const modelName of modelsToTry) {
        console.log(`🎨 [stylize] Preview ${i + 1} — trying ${modelName}...`);
        const result = await generateStylizedImage(ai, cleanBase64, prompt, modelName);
        if (result) {
          previews.push({ ...result, model: modelName });
          console.log(`🎨 [stylize] Preview ${i + 1} — success with ${modelName}`);
          break;
        }
      }
    }

    if (previews.length === 0) {
      console.log('🎨 [stylize] ⚠️ All models failed for all previews');
      return NextResponse.json(
        { error: 'Failed to generate style previews. Try again.' },
        { status: 500 },
      );
    }

    // If photoId was provided, persist each preview to Supabase
    const savedPreviews: { id?: string; imageUrl?: string; imageBase64: string; mimeType: string; model: string }[] = [];

    if (photoId) {
      const origin = request.nextUrl.origin;
      for (let i = 0; i < previews.length; i++) {
        const p = previews[i];
        try {
          const saveRes = await fetch(`${origin}/api/photos/${photoId}/style-previews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              styleId: style.id,
              imageBase64: p.imageBase64,
              mimeType: p.mimeType,
              model: p.model,
              select: i === 0 && count <= 2, // auto-select first if small batch
            }),
          });
          const saveData = saveRes.ok ? await saveRes.json() : null;
          savedPreviews.push({
            id: saveData?.preview?.id,
            imageUrl: saveData?.preview?.image_url,
            imageBase64: p.imageBase64,
            mimeType: p.mimeType,
            model: p.model,
          });
        } catch (saveErr) {
          console.error(`🎨 [stylize] Failed to save preview ${i + 1}:`, saveErr);
          savedPreviews.push({ imageBase64: p.imageBase64, mimeType: p.mimeType, model: p.model });
        }
      }
    } else {
      // No photoId — just return raw base64
      for (const p of previews) {
        savedPreviews.push({ imageBase64: p.imageBase64, mimeType: p.mimeType, model: p.model });
      }
    }

    const elapsed = Date.now() - startTime;
    console.log('');
    console.log('🎨 ════════════════════════════════════════════════════════');
    console.log(`🎨 [stylize] ✅ Generated ${previews.length} preview(s) in ${elapsed}ms`);
    console.log('🎨 ════════════════════════════════════════════════════════');

    return NextResponse.json({
      success: true,
      style: style.id,
      styleLabel: style.label,
      previews: savedPreviews,
      processingTimeMs: elapsed,
    });
  } catch (error: unknown) {
    const elapsed = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`🎨 [stylize] FAILED after ${elapsed}ms:`, message);
    return NextResponse.json(
      { error: message || 'Style transfer failed' },
      { status: 500 },
    );
  }
}
