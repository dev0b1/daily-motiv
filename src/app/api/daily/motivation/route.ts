import { NextRequest, NextResponse } from 'next/server';
import { saveDailyCheckIn, getUserStreak, getUserPreferences, getUserSubscriptionStatus, getTodayCheckIn, getUserCredits, deductCredit, incrementAudioNudgeCount, saveAudioNudge } from '@/lib/db-service';
import { createSunoNudgeClient } from '@/lib/suno-nudge';

const MOTIVATIONS: Record<string, string> = {
  hurting: "Listen… it's okay to hurt. But don't let that pain define you. They couldn't handle your energy, your growth, your realness. You're not broken — you're becoming. Keep choosing yourself. You're literally unstoppable right now.",
  confidence: "You know what? You're doing better than you think. Every day without them is a day you choose YOU. They're out there questioning everything while you're out here leveling up. Keep that crown on. You earned it.",
  angry: "Channel that anger into power. They thought they could play you? Watch you turn that rage into motivation. Every workout, every win, every glow-up is a reminder: you're the catch they couldn't keep. Now go be unstoppable.",
  unstoppable: "THAT'S the energy! You're not just moving on — you're moving UP. They're somewhere crying while you're out here thriving. You didn't lose a partner — you lost a liability. Keep choosing yourself. Elite behavior only."
};

export async function POST(request: NextRequest) {
  try {
  const body = await request.json();
  const { userId, mood, message, preferAudio } = body;

    if (!userId || !mood || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Prevent double check-in: bail early if there's already a check-in today
    const existing = await getTodayCheckIn(userId);
    if (existing) {
      return NextResponse.json({ error: 'already_checked_in', message: 'User already checked in today' }, { status: 409 });
    }

    const motivation = MOTIVATIONS[mood] || MOTIVATIONS.unstoppable;

    // Decide whether to generate audio: honor client preferAudio flag but only proceed
    // if user has opted in or is Pro. We also compute a thumbnail for unsubscribed users
    // and return a previewDuration so the client enforces a 15s preview + upsell.
    let motivationAudioUrl: string | undefined = undefined;

    // Fetch preferences/subscription once and reuse below
    const prefs = await getUserPreferences(userId);
    const sub = await getUserSubscriptionStatus(userId);
    const audioAllowed = !!(sub?.isPro) || !!(prefs?.audioNudgesEnabled);

    if (preferAudio && audioAllowed) {
      try {
        // Check user's credits / free usage before generating to avoid wasted API consumption
        const credits = await getUserCredits(userId);
        const isFree = credits.tier === 'free';
        const isPro = credits.tier === 'unlimited' || credits.tier === 'one-time';

        if (isFree && credits.audioNudgesThisWeek >= 1) {
          // free user exhausted weekly free audio nudges: skip generation and continue with text-only
          console.log('Free user weekly audio nudge limit reached, skipping audio generation');
        } else if (isPro && credits.creditsRemaining <= 0) {
          // pro user has no credits remaining
          console.log('Pro user has no credits remaining, skipping audio generation');
        } else {
          // Use streak as a basic day number context
          const streakData = await getUserStreak(userId);
          const dayNumber = (streakData?.currentStreak || 0) + 1;

          const suno = createSunoNudgeClient();
          const result = await suno.generateDailyNudge({ userStory: message, mood, motivationText: motivation, dayNumber });
          motivationAudioUrl = result.audioUrl;

          // Record usage & deduct credits
          try {
            if (isFree) {
              await incrementAudioNudgeCount(userId);
            } else if (isPro) {
              await deductCredit(userId);
            }

            // Save an audio nudge record for analytics and billing tracking
            await saveAudioNudge(userId, message, dayNumber, motivationAudioUrl || '', motivation, isPro ? 1 : 0);
          } catch (usageError) {
            console.warn('Failed to record audio usage or deduct credit:', usageError);
          }
        }
      } catch (err) {
        console.error('Audio generation failed, continuing with text-only motivation:', err);
        // fall through to save text-only motivation
      }
    }

    const saved = await saveDailyCheckIn({
      userId,
      mood,
      message,
      motivationText: motivation,
      motivationAudioUrl: motivationAudioUrl
    });

    if (!saved) {
      return NextResponse.json({ error: 'already_checked_in', message: 'User already checked in today' }, { status: 409 });
    }

    const streakData = await getUserStreak(userId);

    // If user row missing or streak still 0 after saving, report a client-visible streak of 1
    // so the UI reflects the first-day check-in even if the users table hasn't been initialized.
    const reportedStreak = (streakData?.currentStreak && streakData.currentStreak > 0) ? streakData.currentStreak : 1;

    // Always instruct client to limit preview to 15s. For unsubscribed/free users return a
    // thumbnail (low-fidelity visual) that can be shown behind the player as an upsell.
    const previewDuration = 15; // seconds
  const thumbnailUrl = (!sub?.isPro) ? `/demo-nudges/thumbs/${mood}.svg` : null;

    return NextResponse.json({
      success: true,
      motivation,
      motivationAudioUrl: motivationAudioUrl || null,
      streak: reportedStreak,
      previewDuration,
      thumbnailUrl
    });
  } catch (error) {
    console.error('Error generating motivation:', error);
    return NextResponse.json(
      { error: 'Failed to generate motivation' },
      { status: 500 }
    );
  }
}
