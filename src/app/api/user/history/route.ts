import { NextRequest, NextResponse } from 'next/server';
import { getUserRoasts } from '@/lib/db-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ roasts: [] }, { status: 200 });
    }

    const roasts = await getUserRoasts(userId);
    
    return NextResponse.json({ roasts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
