import { NextRequest, NextResponse } from 'next/server';
import * as postgres from '@/lib/db/postgres';

export async function GET() {
  try {
    // Initialize database and create tables
    await postgres.initializeDatabase();
    await postgres.createTables();

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
