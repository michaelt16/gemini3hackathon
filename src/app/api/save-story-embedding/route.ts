import { NextRequest, NextResponse } from 'next/server';
import * as postgres from '@/lib/db/postgres';

interface StoryEmbeddingRequest {
  storyId: string;
  embedding: number[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StoryEmbeddingRequest;

    if (!body.storyId || !body.embedding) {
      return NextResponse.json(
        { error: 'Invalid request: storyId and embedding required' },
        { status: 400 }
      );
    }

    await postgres.insertStoryEmbedding(body.storyId, body.embedding);

    return NextResponse.json({
      success: true,
      message: 'Story embedding saved',
    });
  } catch (error) {
    console.error('Story embedding error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
