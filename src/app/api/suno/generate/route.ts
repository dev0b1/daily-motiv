import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { db } from '@/server/db';
import { songs } from '@/src/db/schema';
import { enqueueAudioJob } from '@/lib/db-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, tags, title } = body;

    if (!prompt || prompt.trim().length < 5) {
      return NextResponse.json({ success: false, error: 'prompt_too_short' }, { status: 400 });
    }

    // Create a placeholder song row (client will use this id)
    const [inserted] = await db.insert(songs).values({
      title: title || 'Generating...',
      story: prompt.slice(0, 1000),
      style: tags || 'unknown',
      previewUrl: '/audio/placeholder-preview.mp3',
      fullUrl: '/audio/placeholder-full.mp3',
    }).returning();

    const songId = inserted.id;

    // Build callback URL for provider
    const callbackUrl = process.env.SUNO_CALLBACK_URL || (process.env.SITE_DOMAIN ? `https://${process.env.SITE_DOMAIN}/api/suno/callback` : '');

    const sunoBody: any = {
      prompt,
      style: tags || undefined,
      title: title || undefined,
    };
    if (callbackUrl) sunoBody.callBackUrl = callbackUrl;

    console.info('[api] suno generate request', { songId, hasCallback: !!callbackUrl });
    const start = Date.now();
    const resp = await axios.post('https://api.sunoapi.org/api/v1/generate', sunoBody, {
      headers: {
        Authorization: `Bearer ${process.env.SUNO_API_KEY || ''}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    const tookMs = Date.now() - start;
    const taskId = resp.data?.data?.id || resp.data?.id || null;
    console.info('[api] suno generate response', { songId, taskId, status: resp.status, tookMs });
    // Create an audio job record so webhook can map back to this song
    const jobPayload = { songId, prompt, title, tags };
    console.debug('[api] enqueueing audio job', { songId, providerTaskId: taskId });
    const jobId = await enqueueAudioJob({ userId: songId, type: 'song', payload: jobPayload, providerTaskId: taskId || undefined });
    console.info('[api] enqueueAudioJob result', { songId, jobId });

    return NextResponse.json({ success: true, data: [{ id: songId, title: title || 'Generating...' }], taskIds: taskId ? [taskId] : [], jobId });
  } catch (err: unknown) {
    const msg = (err instanceof Error) ? (err.message) : (typeof err === 'object' ? JSON.stringify(err) : String(err));
    console.error('Suno generate error', (err as any)?.response?.data || msg || err);
    return NextResponse.json({ success: false, error: msg || 'generate_failed' }, { status: 500 });
  }
}
