import { NextResponse } from 'next/server';
import { db } from '@/db';

export async function GET() {
  try {
    // Simple query to test database connectivity
    const result = await db.execute('SELECT 1 as test');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      result: result.rows[0],
    });
  } catch (error) {
    console.error('Database connection error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}