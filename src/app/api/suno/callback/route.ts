import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { audioGenerationJobs, songs } from '@/src/db/schema';
import { markJobSucceeded } from '@/lib/db-service';
import { sql } from 'drizzle-orm';
import { publishEvent } from '@/lib/sse';

export async function POST(req: NextRequest) {
  const raw = await req.text();
  console.info('[api/suno/callback] received callback (raw length)', { len: raw?.length });
  let body: any;
  try { body = JSON.parse(raw); } catch (e) { console.warn('[api/suno/callback] invalid json payload', { err: e }); return NextResponse.json({ code:400, msg:'invalid json' }, { status:400 }); }

  const taskId = body?.data?.task_id || body?.task_id || body?.data?.id || null;
  const items = body?.data?.data || body?.data || [];

  if (!taskId) {
    console.warn('[api/suno/callback] missing task id in payload', { bodyKeys: Object.keys(body || {}) });
    return NextResponse.json({ code:400, msg:'missing task id' }, { status:400 });
  }

  try {
    // Find job by providerTaskId exact match
    console.debug('[api/suno/callback] looking up job by providerTaskId', { taskId });
    const rows = await db.select().from(audioGenerationJobs).where((audioGenerationJobs as any).providerTaskId.eq(taskId)).limit(1);
    if (!rows || rows.length === 0) {
      console.warn('[api/suno/callback] no matching job for taskId', taskId);
      // still publish the event so SSE clients can see the callback
      try { publishEvent(taskId, { taskId, items, status: 'complete' }); } catch (e) { console.warn('[api/suno/callback] publishEvent failed', e); }
      return NextResponse.json({ code:404, msg:'job not found' }, { status:404 });
    }

    const jobRow = rows[0];
    console.info('[api/suno/callback] matched job', { jobId: jobRow.id, providerTaskId: jobRow.providerTaskId, createdAt: jobRow.createdAt });
    const jobId = jobRow.id;
    let parsedPayload: any = {};
    try { parsedPayload = JSON.parse(jobRow.payload); } catch (e) { parsedPayload = {}; }

    const appSongId = parsedPayload.songId || parsedPayload.song_id || null;

    const item = Array.isArray(items) && items.length > 0 ? items[0] : items;
    const audioUrl = item?.audio_url || item?.stream_audio_url || null;
    const mp4Url = item?.video_url || item?.mp4_url || null;
    const duration = item?.duration ? Math.round(item.duration) : undefined;

    if (appSongId) {
      console.debug('[api/suno/callback] updating songs row', { appSongId, audioUrl, mp4Url, duration });
      const res = await db.update(songs).set({
        previewUrl: audioUrl || undefined,
        fullUrl: mp4Url || audioUrl || undefined,
        duration: duration || undefined,
        updatedAt: new Date()
      }).where(sql`${songs.id} = ${appSongId}`);
      console.info('[api/suno/callback] songs update result', { appSongId, result: !!res });
    }

    // mark job succeeded and publish SSE event
    const marked = await markJobSucceeded(jobId, audioUrl || mp4Url || '');
    console.info('[api/suno/callback] markJobSucceeded result', { jobId, success: marked });
    try { publishEvent(taskId, { taskId, item, status: 'complete', audioUrl, mp4Url, duration, songId: appSongId }); } catch (e) { console.warn('[api/suno/callback] publishEvent failed', e); }

    return NextResponse.json({ code:200, msg:'ok' });
  } catch (err: any) {
    console.error('Error handling Suno callback:', err);
    return NextResponse.json({ code:500, msg:'internal error' }, { status:500 });
  }
}
