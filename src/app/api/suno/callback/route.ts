import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { audioGenerationJobs, songs } from '@/src/db/schema';
import { markJobSucceeded } from '@/lib/db-service';
import { publishEvent } from '@/lib/sse';

export async function POST(_req: NextRequest) {
  return NextResponse.json({ success: false, error: 'Suno callbacks disabled. Suno integration removed.' }, { status: 410 });
}
}
