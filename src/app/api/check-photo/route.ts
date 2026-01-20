/**
 * API Route for checking if a photo is visible in frame with corner detection
 * Simplified version that uses the same approach as the playground
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        detected: false,
        confidence: 0,
        allCornersVisible: false,
        quality: 'poor',
        issues: ['API key not configured'],
      }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Simple prompt similar to the playground's approach
    const prompt = `Look at this camera frame. Is there a physical photograph, printed photo, or document visible? Are ALL FOUR CORNERS of the photo clearly visible and not cut off? 

Answer in this exact format: PHOTO:YES/NO CORNERS:YES/NO
Example: "PHOTO:YES CORNERS:YES" or "PHOTO:YES CORNERS:NO" or "PHOTO:NO CORNERS:NO"`;

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const text = response.text().trim().toUpperCase();
    
    // Parse the response
    const hasPhoto = text.includes('PHOTO:YES');
    const allCornersVisible = text.includes('CORNERS:YES');
    
    return NextResponse.json({
      detected: hasPhoto,
      confidence: hasPhoto ? (allCornersVisible ? 0.9 : 0.6) : 0,
      allCornersVisible: allCornersVisible,
      quality: allCornersVisible ? 'good' : (hasPhoto ? 'partial' : 'poor'),
      issues: allCornersVisible ? [] : (hasPhoto ? ['Some corners not visible'] : ['No photo detected']),
    });
  } catch (error: any) {
    console.error('Photo check error:', error);
    return NextResponse.json({
      detected: false,
      confidence: 0,
      allCornersVisible: false,
      quality: 'poor',
      issues: [`Analysis failed: ${error?.message || 'Unknown error'}`],
    }, { status: 500 });
  }
}
