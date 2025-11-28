import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  return NextResponse.json({ success: false, error: 'Suno integration disabled. Use Eleven/OpenRouter flows.' }, { status: 410 });
}
