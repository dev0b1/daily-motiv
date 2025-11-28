import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { songs } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';
import { generateLyricsFromLLM, splitLyricsIntoLines } from '@/lib/llm';
import { generateMusicWithEleven } from '@/lib/eleven';

interface ReqBody {
  story: string;
  style: string;
  mood?: string;
  duration?: number;
}

export async function POST(req: NextRequest) {
  // Server-side audio generation has been retired. Return 410 Gone.
  return NextResponse.json({ success: false, error: 'audio_generation_disabled' }, { status: 410 });
}
