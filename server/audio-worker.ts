import { createSunoNudgeClient } from '../lib/suno-nudge';
import { claimPendingJob, markJobSucceeded, markJobFailed, saveAudioNudge, refundCredit } from '../lib/db-service';
import { createSunoClient } from '../lib/suno';
import { eq } from 'drizzle-orm';

async function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

async function processJob(job: any) {
  const suno = createSunoNudgeClient();
  const jobId = job.id;
  console.info('[worker] processing job', { jobId: jobId, type: job.type });
  let payload: any;
  try {
    payload = JSON.parse(job.payload);
  } catch (e) {
    await markJobFailed(jobId, 'Invalid job payload');
    return;
  }
  try {
    const payloadSize = Buffer.byteLength(job.payload || '', 'utf8');
    console.debug('[worker] job payload parsed', { jobId, payloadSize, keys: Object.keys(payload || {}) });
  } catch (err) {
    console.warn('[worker] failed to inspect payload size', err);
  }

  try {
    if (job.type === 'daily') {
      const { userId, mood, message, motivationText, dayNumber, checkInId } = payload;
      const result = await suno.generateDailyNudge({ userStory: message, mood, motivationText, dayNumber });
      const saved = await saveAudioNudge(userId, message, dayNumber || 1, result.audioUrl, motivationText || '', 1);
      // Update check-in with audio URL: do a raw update to daily_check_ins
      try {
        const { db } = await import('../server/db');
        const { dailyCheckIns } = await import('../src/db/schema');
        await db.update(dailyCheckIns).set({ motivationAudioUrl: result.audioUrl }).where(eq((dailyCheckIns as any).id, checkInId));
      } catch (e) {
        console.warn('Failed to attach audio url to check-in:', e);
      }

      await markJobSucceeded(jobId, result.audioUrl);
    } else if (job.type === 'song') {
      const { songId, userId, prompt, title, tags, style, reservedCredit } = payload;
      const sunoSongClient = await import('../lib/suno');
      const suno = sunoSongClient.createSunoClient();
      console.info('[worker] starting music generation', { jobId, songId, title, style });
      let musicResult: any = null;
      try {
        const start = Date.now();
        // Prefer callback-based generation if SITE_DOMAIN or SUNO_CALLBACK_URL is configured.
        const callbackUrl = process.env.SUNO_CALLBACK_URL || (process.env.SITE_DOMAIN ? `https://${process.env.SITE_DOMAIN}/api/suno/callback` : '');
        if (callbackUrl) {
          console.info('[worker] using callback URL for Suno generation', { jobId, songId, callbackUrl: !!callbackUrl });
          try {
            // pass callBackUrl so provider can callback when ready; generateSong will return a pending result with taskId
            musicResult = await suno.generateSong({ prompt, title, tags, style, callBackUrl: callbackUrl });
          } catch (e) {
            // fallback to polling mode if callback request failed
            console.warn('[worker] Suno callback generation failed, falling back to polling generateSong', { jobId, songId, err: e });
            musicResult = await suno.generateSong({ prompt, title, tags, style });
          }
        } else {
          musicResult = await suno.generateSong({ prompt, title, tags, style });
        }
        const tookMs = Date.now() - start;
        console.info('[worker] music generation completed', { jobId, songId, tookMs, audioUrl: musicResult?.audioUrl, videoUrl: musicResult?.videoUrl });
      } catch (genErr: any) {
        console.error('[worker] music generation failed', { jobId, songId, message: genErr?.message || genErr, details: genErr?.response?.data || null });
        throw genErr;
      }

      // default fullUrl to audio if video not produced
      let finalFullUrl = musicResult.videoUrl || musicResult.audioUrl;

      // If we have identifiers, attempt MP4 packaging via Suno's MP4 endpoint
      try {
        const taskId = musicResult.taskId || undefined;
        // prefer explicit audioId, fall back to musicResult.id
        const audioId = (musicResult as any).audioId || musicResult.id || undefined;

        // If provider returned a taskId but did not immediately return audioUrl (callback-based),
        // persist providerTaskId on the job so the callback handler can map it and update records.
        if (taskId && !musicResult.audioUrl) {
          try {
            const { db } = await import('../server/db');
            const { audioGenerationJobs } = await import('../src/db/schema');
            await db.update(audioGenerationJobs).set({ providerTaskId: taskId, updatedAt: new Date() }).where(eq((audioGenerationJobs as any).id, jobId));
            console.info('[worker] persisted providerTaskId for callback', { jobId, songId, providerTaskId: taskId });
          } catch (e) {
            console.warn('[worker] failed to persist providerTaskId on job', { jobId, songId, err: e });
          }
        }

        if (taskId && audioId) {
          console.info('[worker] requesting mp4 packaging', { jobId, songId, taskId, audioId });
          const mp4Resp = await suno.generateMp4({ taskId, audioId, callBackUrl: process.env.SUNO_MP4_CALLBACK || '', author: 'exroast.ai', domainName: process.env.SITE_DOMAIN || 'exroast.ai' });
          const mp4TaskId = mp4Resp.mp4TaskId;
          console.info('[worker] mp4 packaging requested', { jobId, songId, mp4TaskId });
          try {
            const poll = await suno.pollForMp4(mp4TaskId, 120); // wait up to ~6 minutes
            if (poll && poll.videoUrl) {
              finalFullUrl = poll.videoUrl;
              console.info('[worker] mp4 packaging complete', { jobId, songId, mp4TaskId, videoUrl: poll.videoUrl });
            }
          } catch (e: unknown) {
            const eMsg = (e instanceof Error) ? e.message : (typeof e === 'object' ? JSON.stringify(e) : String(e));
            console.warn('[worker] MP4 generation/polling failed, falling back to audio', { jobId, songId, mp4TaskId, error: eMsg });
          }
        }
      } catch (e) {
        console.warn('MP4 packaging step failed:', e);
      }

      // update songs table with returned URLs, duration, lyrics when available
      try {
        const { db } = await import('../server/db');
        const { songs } = await import('../src/db/schema');
        console.debug('[worker] updating songs row', { jobId, songId, finalFullUrl });
        await db.update(songs).set({ previewUrl: musicResult.audioUrl, fullUrl: finalFullUrl, duration: musicResult.duration || 60, lyrics: musicResult.lyrics || undefined }).where(eq((songs as any).id, songId));
        console.info('[worker] songs row updated', { jobId, songId });
      } catch (e) {
        console.warn('[worker] Failed to update song record after generation:', e);
      }

      await markJobSucceeded(jobId, musicResult.audioUrl);
    } else {
      await markJobFailed(jobId, `Unsupported job type: ${job.type}`);
    }
  } catch (err: unknown) {
    const errMsg = (err instanceof Error) ? (err.message || String(err)) : (typeof err === 'object' ? JSON.stringify(err) : String(err));
    console.error('Job processing failed:', errMsg);
    // Attempt a refund if credits were reserved for this job
    try {
      if (payload?.reservedCredit) {
        await refundCredit(payload.userId, 1);
      }
    } catch (e) {
      console.warn('Failed to refund credit on job failure:', e);
    }
    await markJobFailed(jobId, (err instanceof Error && err.message) ? err.message : 'Unknown error');
  }
}

async function runWorker() {
  console.log('Audio worker started');
  while (true) {
    try {
      const job = await claimPendingJob();
      if (!job) {
        await sleep(2000);
        continue;
      }
      console.log('Claimed job', job.id, job.type);
      await processJob(job);
    } catch (e) {
      console.error('Worker loop error:', e);
      await sleep(3000);
    }
  }
}

if (require.main === module) {
  runWorker().catch(err => {
    console.error('Worker crashed:', err);
    process.exit(1);
  });
}

export default runWorker;
