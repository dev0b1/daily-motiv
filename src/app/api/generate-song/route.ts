import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { eq } from 'drizzle-orm';
import { songs } from '@/src/db/schema';
import { createOpenRouterClient } from '@/lib/openrouter';
import { enqueueAudioJob, reserveCredit, refundCredit } from '@/lib/db-service';
import { createSunoClient } from '@/lib/suno';

interface GenerateSongRequest {
  story: string;
  style: string;
  musicStyle?: string;
  overrideLyrics?: string;
  songId?: string;
  paidPurchase?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateSongRequest = await request.json();
    const { story, style, musicStyle, overrideLyrics, songId: existingSongId, paidPurchase } = body;

    if (!story || story.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Story is too short' },
        { status: 400 }
      );
    }

    const validStyles = ['sad', 'savage', 'healing', 'vibe', 'meme', 'petty', 'glowup'];
    if (!validStyles.includes(style)) {
      return NextResponse.json(
        { success: false, error: 'Invalid style selected' },
        { status: 400 }
      );
    }

    console.log('Step 1: Preparing song prompt...');
    
    // If the client provided edited/override lyrics, use them directly.
    let promptResult;
    if (overrideLyrics && overrideLyrics.trim().length > 10) {
      promptResult = {
        title: `${style.charAt(0).toUpperCase() + style.slice(1)} Song (Custom Lyrics)`,
        tags: `${style}, custom, heartbreak`,
        prompt: overrideLyrics.trim(),
      };
      console.log('Using override lyrics provided by client');
    } else {
      console.log('Generating song prompt with OpenRouter...');
      try {
        const openRouterClient = createOpenRouterClient();
        promptResult = await openRouterClient.generateSongPrompt({
          extractedText: story,
          style,
          musicStyle: musicStyle || undefined,
        });
        
        if (!promptResult.prompt || promptResult.prompt.length < 20) {
          throw new Error('Generated lyrics are too short');
        }
        
        console.log('Prompt generated:', promptResult.title);
      } catch (promptError) {
        console.error('OpenRouter prompt generation failed:', promptError);
        
        promptResult = {
          title: `${style.charAt(0).toUpperCase() + style.slice(1)} HeartHeal Song`,
          tags: `${style}, emotional, heartbreak, healing`,
          prompt: `A ${style} song about heartbreak, emotional healing, and moving forward.\n${story.substring(0, 200)}`,
        };
        
        console.log('Using fallback prompt template');
      }
    }

    let previewUrl = '/audio/placeholder-preview.mp3';
    let fullUrl = '/audio/placeholder-full.mp3';
    let lyrics = promptResult.prompt;
    // If a musical style was provided by the client, append it to tags so the audio job can use it
    if (musicStyle && musicStyle.trim().length > 0) {
      promptResult.tags = `${promptResult.tags}, ${musicStyle}`;
    }
    let duration = 30;

    let song: any = null;

    // If an existing songId was provided (e.g., the user purchased a demo and now
    // wants a personalized generation), update that row instead of inserting a new one.
    if (existingSongId) {
      const rows = await db.select().from(songs).where(eq(songs.id, existingSongId)).limit(1);
      if (rows && rows.length > 0) {
        song = rows[0];
        // Update lyrics (if override provided) and set placeholder urls while job runs
        await db.update(songs).set({
          lyrics: lyrics,
          previewUrl,
          fullUrl,
          updatedAt: new Date()
        }).where(eq(songs.id, existingSongId));
        song = { ...song, lyrics, previewUrl, fullUrl };
      } else {
        return NextResponse.json({ success: false, error: 'song_not_found' }, { status: 404 });
      }
    } else {
      // Insert a song row immediately with placeholder URLs. We'll enqueue a background
      // job to generate the actual audio and update this song when complete.
      const [inserted] = await db.insert(songs).values({
        title: promptResult.title,
        story,
        style,
        lyrics: lyrics,
        genre: promptResult.tags,
        mood: style,
        previewUrl,
        fullUrl,
        isPurchased: false,
      }).returning();
      song = inserted;
    }

    // If the request provided a userId (or via header), attempt to reserve a credit
    // for pro users before enqueueing the job. The client may pass userId in body.
    const bodyJson = await request.json().catch(() => ({}));
    const userId = (bodyJson && bodyJson.userId) || (request.headers.get('x-user-id') || null);
    let reservedCredit = false;
    // Do not reserve credits when this generation is being kicked off as part of
    // a paid single-song checkout (paidPurchase === true). In that case the
    // purchase webhook is authoritative and we should not deduct subscription credits.
    if (userId && !paidPurchase) {
      try {
        reservedCredit = await reserveCredit(userId);
        if (!reservedCredit) {
          // return an error indicating no credits
          return NextResponse.json({ success: false, error: 'no_credits' }, { status: 402 });
        }
      } catch (e) {
        console.warn('Failed to reserve credit for user:', e);
      }
    }

    const jobPayload = {
      songId: song.id,
      userId: userId,
      prompt: promptResult.prompt,
      title: promptResult.title,
      tags: promptResult.tags,
      style,
      musicStyle: musicStyle || null,
      reservedCredit
    };

    // Prefer callback-first Suno flow: request Suno to generate and callback to our webhook.
    const suno = createSunoClient();
    const callbackUrl = process.env.SUNO_CALLBACK_URL || (process.env.SITE_DOMAIN ? `https://${process.env.SITE_DOMAIN}/api/suno/callback` : '');

    let taskId: string | null = null;
    try {
      const sunoResp: any = await suno.generateSong({ prompt: promptResult.prompt, title: promptResult.title, tags: promptResult.tags, make_instrumental: false, callBackUrl: callbackUrl });
      taskId = sunoResp?.taskId || sunoResp?.id || null;
      if (taskId) {
        console.info('[api] suno callback task created', { songId: song.id, taskId });
      }
    } catch (e) {
      console.warn('Suno callback generate failed, falling back to enqueue-only flow', e);
    }

    const jobId = await enqueueAudioJob({ userId: userId || song.id, type: 'song', payload: jobPayload, providerTaskId: taskId || undefined });
    if (!jobId) {
      // enqueue failed: refund reserved credit if any
      if (reservedCredit && userId) {
        try { await refundCredit(userId); } catch (e) { console.warn('Failed to refund credit after enqueue failure', e); }
      }
      return NextResponse.json({ success: false, error: 'failed_to_enqueue' }, { status: 500 });
    }

    return NextResponse.json({ success: true, songId: song.id, jobId, taskId, title: promptResult.title, lyrics });
  } catch (error) {
    console.error('Error generating song:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate song',
      },
      { status: 500 }
    );
  }
}
