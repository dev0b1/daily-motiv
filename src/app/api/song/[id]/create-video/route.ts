import { NextRequest, NextResponse } from 'next/server';
import { enqueueAudioJob } from '@/lib/db-service';
import { db } from '@/server/db';
import { songs } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest, context: any) {
  try {
    const params = context?.params;
    const resolvedParams = params && typeof params.then === 'function' ? await params : params;
    const id = resolvedParams?.id;
    if (!id) return NextResponse.json({ success: false, error: 'missing_id' }, { status: 400 });

    // Verify song exists
    const rows = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
    if (!rows || rows.length === 0) return NextResponse.json({ success: false, error: 'song_not_found' }, { status: 404 });
    const song = rows[0];

    // Build job payload. Worker expects payload: { songId, story, style, mood, duration }
    const payload = { songId: id, story: song.story, style: song.style, mood: song.mood || 'savage', duration: song.duration || 60 };

    const jobId = await enqueueAudioJob({ userId: song.userId || song.id, type: 'eleven', payload });
    if (!jobId) return NextResponse.json({ success: false, error: 'enqueue_failed' }, { status: 500 });

    // Optionally mark the song as having a pending video status via the jobs table; the client will poll for file availability.
    console.info('[api/create-video] enqueued video job', { songId: id, jobId });
    return NextResponse.json({ success: true, jobId });
  } catch (err) {
    console.error('[api/create-video] error', err);
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }
}
