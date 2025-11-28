import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { eq } from 'drizzle-orm';
import { songs } from '@/src/db/schema';
// OpenRouter removed: use user story + style + musicStyle directly as prompt
import { enqueueAudioJob, reserveCredit, refundCredit } from '@/lib/db-service';

interface GenerateSongRequest {
  story: string;
  style: string;
  musicStyle?: string;
  overrideLyrics?: string;
  songId?: string;
  paidPurchase?: boolean;
}

export async function POST(request: NextRequest) {
  // Server-side audio generation has been retired. Enqueueing jobs/creating server-side
  // song rows is no longer supported. Return 410 Gone.
  return NextResponse.json({ success: false, error: 'audio_generation_disabled' }, { status: 410 });
}
