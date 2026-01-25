import { NextRequest, NextResponse } from 'next/server';
import * as postgres from '@/lib/db/postgres';

interface SearchRequest {
  descriptor: number[];
  threshold?: number;
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SearchRequest;

    if (!body.descriptor || !Array.isArray(body.descriptor)) {
      return NextResponse.json(
        { error: 'Invalid request: descriptor must be a number array' },
        { status: 400 }
      );
    }

    const results = await postgres.findSimilarFaces(
      body.descriptor,
      body.threshold || 0.45,
      body.limit || 5
    );

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Face search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
