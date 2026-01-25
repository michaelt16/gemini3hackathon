import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface EmbedRequest {
  text: string;
}

/**
 * Generate embedding for narrative text using Gemini Embedding API
 * Returns a 768-dimensional vector suitable for semantic search
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EmbedRequest;

    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: text field required' },
        { status: 400 }
      );
    }

    // Use Gemini's embedding model
    const model = genAI.getGenerativeModel({ model: 'embedding-001' });
    const result = await model.embedContent(body.text);
    const embedding = result.embedding.values;

    return NextResponse.json({
      success: true,
      embedding,
      dimensions: embedding.length,
    });
  } catch (error) {
    console.error('Embedding error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
