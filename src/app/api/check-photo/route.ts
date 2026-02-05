/**
 * API Route for checking if a photo is visible in frame with corner detection
 * Returns 200 with detected: false on API/parse errors so the scan loop keeps running.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

function safeResponse(
  detected: boolean,
  allCornersVisible: boolean,
  issues: string[] = []
) {
  return NextResponse.json({
    detected,
    confidence: detected ? (allCornersVisible ? 0.9 : 0.6) : 0,
    allCornersVisible,
    quality: allCornersVisible ? 'good' : (detected ? 'partial' : 'poor'),
    issues: allCornersVisible ? [] : (detected ? ['Some corners not visible'] : issues.length ? issues : ['No photo detected']),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return safeResponse(false, false, ['API key not configured']);
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Prefer 1.5-flash (stable); fallback to 2.0-flash-exp if needed
    const modelName = 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `You are looking at a camera image. 

1. Is there a physical photograph, printed picture, or paper document visible in the image? (Answer PHOTO:YES or PHOTO:NO)
2. If yes, are most or all of its four corners visible (not cut off by the edges)? (Answer CORNERS:YES or CORNERS:NO)

Reply with exactly two words in this format: PHOTO:YES CORNERS:YES or PHOTO:YES CORNERS:NO or PHOTO:NO CORNERS:NO. Nothing else.`;

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    if (!cleanBase64 || cleanBase64.length < 100) {
      return safeResponse(false, false, ['Invalid image data']);
    }

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      },
      prompt,
    ]);

    const response = result.response;
    if (!response) {
      return safeResponse(false, false, ['No response from model']);
    }

    let text: string;
    try {
      text = (response.text?.() ?? '').trim().toUpperCase();
    } catch {
      const candidate = response.candidates?.[0];
      const blockReason = candidate?.finishReason ?? 'unknown';
      if (blockReason && blockReason !== 'STOP') {
        console.warn('Photo check blocked:', blockReason);
      }
      return safeResponse(false, false, ['Could not read model response']);
    }

    if (!text) {
      return safeResponse(false, false, ['Empty model response']);
    }

    // Be lenient: accept PHOTO:YES and CORNERS:YES with optional spaces (model may add extra text)
    const hasPhoto = /PHOTO\s*:\s*YES|PHOTO\s+YES/i.test(text);
    const allCornersVisible = /CORNERS\s*:\s*YES|CORNERS\s+YES/i.test(text);

    return safeResponse(hasPhoto, allCornersVisible);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Photo check error:', message);
    return safeResponse(false, false, [`Analysis failed: ${message}`]);
  }
}
