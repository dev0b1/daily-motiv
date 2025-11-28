"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FaCheckCircle, FaDownload, FaMusic } from "react-icons/fa";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import PendingClaimBanner from '@/components/PendingClaimBanner';
import AuthAwareCTA from "@/components/AuthAwareCTA";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface SongPayload {
  id: string;
  story: string;
  lyrics: string;
  style: string;
  isPurchased?: boolean;
  fullUrl?: string | null;
}

export default function SuccessPage() {
  const [song, setSong] = useState<SongPayload | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  // append a debug log (keeps newest first, cap to 200 entries)
  const addDebug = (msg: string) => {
    try {
      setDebugLogs(prev => {
        const entry = `${new Date().toISOString()} ${msg}`;
        const next = [entry, ...prev];
        if (next.length > 200) next.length = 200;
        return next;
      });
    } catch (e) {
      // best-effort logging
      console.debug('addDebug error', e);
    }
  };
  const [isGranting, setIsGranting] = useState(false);
  const [grantMessage, setGrantMessage] = useState<string | null>(null);
  const [editedLyrics, setEditedLyrics] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const supabase = createClientComponentClient();
  // UI-only indicator for slow generations (no browser notifications)

  useEffect(() => {
    if (typeof window === 'undefined') return;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const type = params.get('type');
        const songId = params.get('songId');

        // Fetch song metadata if present so we can re-run generation
        if (songId) {
          try {
            const res = await fetch(`/api/song/${encodeURIComponent(songId)}`);
            if (res.ok) {
              const body = await res.json();
              if (body && body.song) {
                setSong({ id: body.song.id, story: body.song.story, lyrics: body.song.lyrics || '', style: body.song.style || 'savage' });
                setEditedLyrics(body.song.lyrics || '');
              }
            }
          } catch (e) {
            console.warn('Failed to fetch song after success', e);
          }
        }

        // Immediate grant: for signed-in users, call server to persist credits immediately.
        // For guests, persist a local one-time token so they can immediately use the credit in this browser.
        const creditsToGrant = (params.get('type') === 'single') ? 1 : (params.get('tier') === 'weekly' ? 3 : 1);

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Authenticated: persist credits server-side immediately
            setIsGranting(true);
            try {
              const res = await fetch('/api/credits/grant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: creditsToGrant })
              });
              const body = await res.json();
              if (body && body.success) {
                setGrantMessage(`Saved ${creditsToGrant} credit${creditsToGrant>1?'s':''} to your account.`);
                setIsConfirmed(true);
              } else {
                setGrantMessage('Failed to save credit server-side. It will be applied after webhook confirmation.');
              }
            } catch (e) {
              console.error('Grant credits error:', e);
              setGrantMessage('Network error saving credit — it will be applied after confirmation.');
            } finally {
              setIsGranting(false);
            }
          } else {
            // Guest: persist a local token and pendingCredits so they can use the credit immediately in this browser
            try {
              const existing = localStorage.getItem('pendingCredits');
              const existingNum = existing ? parseInt(existing, 10) : 0;
              localStorage.setItem('pendingCredits', String(existingNum + creditsToGrant));
              // store a one-time token to indicate this browser has an available paid credit
              const makeToken = () => {
                try {
                  // prefer crypto.randomUUID when available
                  // @ts-ignore
                  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
                    // @ts-ignore
                    return (crypto as any).randomUUID();
                  }
                } catch (e) {}
                return 'local-' + Math.random().toString(36).slice(2, 12);
              };
              const token = makeToken();
              localStorage.setItem('pendingCreditToken', token);
              setGrantMessage(`Saved ${creditsToGrant} demo credit locally — you can use it now in this browser.`);
              setIsConfirmed(true);
            } catch (e) {
              console.warn('Failed to persist pending credit locally', e);
              setGrantMessage('Saved pending credit failed locally — please sign in to claim after confirmation.');
            }
          }
        } catch (e) {
          console.warn('Failed to detect user session for immediate grant', e);
        }

        // If this is a single-song checkout, persist songId so guest can claim after sign-in
        if (params.get('type') === 'single' && songId) {
          try { localStorage.setItem('pendingSingleSongId', songId); } catch (e) { console.warn('Failed to save pendingSingleSongId', e); }
        }
      } catch (e) {
        console.warn('Success page init error', e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start generation on this page for single-song purchases.
  useEffect(() => {
    let mounted = true;
    let slowTimer: any = null;

    const checkStatusOnce = async (id: string) => {
      try {
        const res = await fetch(`/api/song/${encodeURIComponent(id)}`);
        if (!res.ok) return null;
        const body = await res.json();
        return body.song;
      } catch (e) { return null; }
    };

    const doGenerate = async () => {
      if (!song) return;
      // If the song is already purchased and has fullUrl, skip generating and redirect
      if (song.isPurchased && song.fullUrl) {
        window.location.href = `/song-unlocked?songId=${encodeURIComponent(song.id)}`;
        return;
      }

      setIsGenerating(true);
      setIsSlow(false);
      setGrantMessage('Generation started — you can safely leave this page.');
      addDebug(`doGenerate: started generation for songId=${song.id}`);

      // start slow-request timer (40s) to show a UI-only indicator if desired
      slowTimer = setTimeout(() => {
        if (!mounted) return;
        setIsSlow(true);
      }, 40000);

      try {
        const body: any = { story: song.story, style: song.style, songId: song.id, paidPurchase: true };
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) body.userId = user.id;
        } catch (e) {}

        const res = await fetch('/api/generate-eleven', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        console.debug('doGenerate: /api/generate-eleven response', data);
        addDebug(`generate-eleven resp: ${JSON.stringify({ success: data.success, songId: data.songId, videoUrl: data.videoUrl }).slice(0,300)}`);
        if (!data.success) {
          setGrantMessage(data.error || 'Failed to queue generation — it will be retried.');
          setIsGenerating(false);
          return;
        }

        // Persist pending song id so app can find it later
        try { localStorage.setItem('pendingSingleSongId', data.songId); } catch (e) {}

        // If server returned a final video URL, redirect to the unlocked page immediately
        if (data.videoUrl) {
          if (slowTimer) clearTimeout(slowTimer);
          setIsSlow(false);
          window.location.href = `/song-unlocked?songId=${encodeURIComponent(data.songId)}`;
          return;
        }

        // Otherwise, inform the user generation started and will be available later
        setIsGenerating(false);
        setGrantMessage('Generation started — we will update your account when it finishes. You can return to the app and use the "Check generated song" button.');
      } catch (e) {
        console.error('Auto-generate error:', e);
        setGrantMessage('Network error. Generation failed — please retry from the app.');
        setIsGenerating(false);
        if (slowTimer) clearTimeout(slowTimer);
        setIsSlow(false);
      }
    };

    // Trigger generation automatically once we have song metadata and the page was loaded with a single purchase
    if (song) {
      // small delay to let UI render
      setTimeout(() => { if (mounted) doGenerate(); }, 600);
    }

    return () => {
      mounted = false;
      if (slowTimer) clearTimeout(slowTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-2xl w-full p-6">
        {/* Debug toggle - small floating control */}
        <div className="fixed top-4 right-4 z-50">
          <button
            className="px-3 py-2 bg-white/10 text-white rounded shadow"
            onClick={() => setShowDebug(s => !s)}
          >
            {showDebug ? 'Hide Logs' : 'Show Logs'}
          </button>
        </div>
        {showDebug && (
          <div className="fixed top-16 right-4 z-50 w-[420px] max-h-[60vh] overflow-auto bg-black/80 border border-white/10 p-3 rounded text-xs text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Client Debug Logs</div>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 bg-white/5 rounded" onClick={() => setDebugLogs([])}>Clear</button>
                <button className="px-2 py-1 bg-white/5 rounded" onClick={() => setShowDebug(false)}>Close</button>
              </div>
            </div>
            <div className="text-[11px] leading-tight">
              {debugLogs.length === 0 ? (
                <div className="text-gray-400">No logs yet</div>
              ) : (
                debugLogs.map((l, i) => (
                  <div key={i} className="mb-1 break-words">{l}</div>
                ))
              )}
            </div>
          </div>
        )}
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-white">Payment successful</h1>
          <p className="text-gray-400 mt-2">Generating your personalized song now — this may take a minute or two.</p>
        </div>

        <div className="mt-6">
          {grantMessage && (
            <div className="p-3 bg-white/5 rounded mb-4">{grantMessage}</div>
          )}

          {song ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Original Story</h3>
                <p className="text-sm text-gray-300 italic">"{song.story}"</p>
              </div>

              <div className="p-4 bg-white/5 rounded">
                {isGenerating ? (
                  <div className="text-center text-gray-200">
                    <div className="flex flex-col items-center">
                      <div className="inline-block w-12 h-12 border-4 border-t-transparent border-white/30 rounded-full animate-spin mb-3" aria-hidden="true" />
                      <div className="mb-2">Generating your full song — please wait.</div>
                      <div className="text-sm text-gray-400">If this takes too long, you can return to the app or open the unlocked song page.</div>
                    </div>
                    {isSlow && (
                      <div className="mt-4 p-3 bg-yellow-600/20 border border-yellow-600 rounded text-yellow-100">
                        <div className="flex items-start gap-3">
                          <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse mt-1" />
                          <div>
                            <div className="font-semibold">Generation taking longer than expected</div>
                            <div className="text-sm">We're seeing a temporary spike in processing time — this page will update when your song is ready.</div>
                            <div className="mt-2">
                              <a className="text-sm underline" href={`/song-unlocked?songId=${encodeURIComponent(song.id)}`}>Open unlocked song</a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-300">Generation queued. You can leave this page — we'll redirect when it's ready.</div>
                    <div className="flex items-center gap-2">
                      <button className="px-4 py-2 bg-white/5 text-white rounded" onClick={() => window.location.href = '/app'}>Back to App</button>
                      <a className="px-4 py-2 bg-white text-black rounded font-bold" href={`/song-unlocked?songId=${encodeURIComponent(song.id)}`}>Open Unlocked Song</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-300">Preparing song details…</div>
          )}
        </div>
      </div>
    </div>
  );
}
