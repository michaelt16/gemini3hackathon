import { NextRequest, NextResponse } from 'next/server';
import * as postgres from '@/lib/db/postgres';

interface StorySearchRequest {
  embedding: number[];
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StorySearchRequest;

    if (!body.embedding || !Array.isArray(body.embedding)) {
      return NextResponse.json(
        { error: 'Invalid request: embedding must be a number array' },
        { status: 400 }
      );
    }

    const results = await postgres.searchStories(body.embedding, body.limit || 10);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Story search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
