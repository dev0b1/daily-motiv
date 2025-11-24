"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { openTierCheckout } from "@/lib/checkout";
import { StyleSelector, SongStyle } from "@/components/StyleSelector";
import LoadingProgress, { LoadingStep } from "@/components/LoadingProgress";
import { Tooltip } from "@/components/Tooltip";
import clsx from 'clsx';

interface RoastCreatorProps {
  userId?: string | null;
  initialMode?: SongStyle;
  onComplete?: (songId: string) => void;
}

export default function RoastCreator({ userId, initialMode, onComplete }: RoastCreatorProps) {
  const router = useRouter();
  const [story, setStory] = useState("");
  const [style, setStyle] = useState<SongStyle>(initialMode || "petty");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("lyrics");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [proChecked, setProChecked] = useState(false);

  useEffect(() => {
    // If a mode query param is present, use it to pre-select the style (e.g., ?mode=petty)
    try {
      if (typeof window !== 'undefined') {
        const params = new URL(window.location.href).searchParams;
        const mode = params.get('mode');
        if (mode === 'petty' || mode === 'glowup') {
          setStyle(mode as SongStyle);
        }
      }
    } catch (e) {
      // ignore
    }

    checkProStatus();
  }, []);

  const checkProStatus = async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userId) headers['x-user-id'] = userId;

      const res = await fetch('/api/user/pro-status', { headers });
      if (res.ok) {
        const data = await res.json();
        setIsPro(!!data.isPro);
      }
    } catch (err) {
      console.error('Pro check failed', err);
    } finally {
      setProChecked(true);
    }
  };

  const handleGenerate = async () => {
    if (story.trim().length < 10) {
      alert("Spill more tea! We need at least 10 characters to roast properly 🔥");
      return;
    }

    setIsGenerating(true);
    setLoadingStep('lyrics');
    setLoadingProgress(0);

    try {
      const endpoint = isPro ? '/api/generate-song' : '/api/generate-preview';

      const payload: any = { story, style };
      if (userId) payload.userId = userId;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setLoadingStep('complete');
        setLoadingProgress(100);
        setShowConfetti(true);
        // Persist last preview song id so upgrade flows can find it later (guest/local flow)
        if (!isPro && typeof window !== 'undefined' && data.songId) {
          try {
            localStorage.setItem('pendingPreviewSongId', data.songId);
            if (data.previewUrl) localStorage.setItem('pendingPreviewUrl', data.previewUrl);
          } catch (e) {
            console.warn('Failed to write pending preview to localStorage', e);
          }
        }
        if (!isPro && typeof window !== 'undefined') {
          let recentRoasts: any[] = [];
          try {
            const raw = localStorage.getItem('recentRoasts');
            if (raw) recentRoasts = JSON.parse(raw);
            if (!Array.isArray(recentRoasts)) recentRoasts = [];
          } catch (err) {
            console.warn('Invalid recentRoasts in localStorage, resetting it.', err);
            recentRoasts = [];
          }

          recentRoasts.unshift({ id: data.songId, title: data.title, timestamp: new Date().toISOString() });
          localStorage.setItem('recentRoasts', JSON.stringify(recentRoasts.slice(0, 3)));
        }

        // daily opt-in is handled in the Daily tab; creation flow no longer contains the opt-in card

        setTimeout(() => {
          if (onComplete) onComplete(data.songId);
          else router.push(`/preview?songId=${data.songId}`);
        }, 900);
      } else {
        throw new Error(data.error || 'Failed to generate song');
      }
    } catch (error) {
      console.error('Error generating song:', error);
      alert(`Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="w-full flex items-center justify-center">
        <LoadingProgress currentStep={loadingStep} progress={loadingProgress} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-orange-400 via-red-500 to-red-600 bg-clip-text text-transparent">
          Create Your Savage Roast 🔥
        </h2>
        <p className="text-lg md:text-xl text-gray-300 font-semibold">
          30-second AI diss track that ends them
        </p>
      </div>

  <div className="card space-y-6 px-4 md:px-6 md:max-w-4xl mx-auto">
        <div className="space-y-2">
          <label className="block text-xl font-black text-white">Spill the tea — what did they do? 🔥</label>
          <Tooltip content="Be specific for savage lyrics (e.g., 'Ghosted after tacos')">
            <div className="relative">
              <textarea
                value={story}
                onChange={(e) => { if (e.target.value.length <= 500) setStory(e.target.value); }}
                maxLength={500}
                placeholder="They ghosted me after 2 years... They cheated with my best friend... They said I was 'too much'... Give us EVERYTHING 🗡️"
                className="input-field resize-none"
                style={{ width: '100%', minHeight: 240, fontSize: 16 }}
              />
              <div className="absolute bottom-4 right-4 text-sm text-white/70 font-medium">{story.length}/500</div>
            </div>
          </Tooltip>
          <p className="text-sm text-white italic">💡 The more specific, the more savage the roast</p>
        </div>

        <div className="pt-4">
          <Tooltip content="Petty = Brutal diss; Glow-Up = Victory banger">
            <div>
              <StyleSelector selected={style} onChange={setStyle} />
            </div>
          </Tooltip>
        </div>

        {/* Daily Petty Power-Ups card removed from creation UI — moved to Daily tab to avoid clutter */}

        <div className="flex justify-center">
          {(() => {
            const isDisabled = story.trim().length < 10 || !proChecked;
            return (
              <button
                onClick={handleGenerate}
                disabled={isDisabled}
                className={clsx(
                  // mobile: shorter/taller adjustments; md+ use larger padding/font
                  "rounded-2xl font-black transition-all duration-150 w-full",
                  isDisabled
                    ? "py-2 text-lg bg-[#555] text-[#999] cursor-not-allowed opacity-60"
                    : "py-3 md:py-4 text-lg md:text-xl bg-[#ffd23f] text-white"
                )}
                style={isDisabled ? {} : { border: '3px solid #ff006e', boxShadow: '0 0 20px rgba(255, 210, 63, 0.6)', maxWidth: '920px' }}
              >
                { !proChecked ? 'Checking account…' : 'Generate My Roast 🔥💅' }
              </button>
            );
          })()}
        </div>

        <div className="flex flex-col items-center space-y-3">
          <p className="text-center text-sm text-gray-400">Demo song (template) — full demo available. Upgrade for a personalized song.</p>
           <button onClick={async () => {
             try {
               // openTierCheckout will re-check auth and open Paddle. It also marks `inCheckout`.
               await openTierCheckout('premium');
             } catch (err) {
               console.error('Failed to open checkout from RoastCreator', err);
               // As a safe fallback, navigate to pricing so user can sign in / choose a plan.
               try { window.location.href = '/pricing'; } catch (e) { }
             }
           }} className="bg-gradient-to-r from-[#ff006e] to-[#ffd23f] text-black font-bold px-6 py-3 rounded-md focus:outline-none focus:ring-4 focus:ring-exroast-gold/60">Upgrade for a personalized song</button>
        </div>
      </div>

    </div>
  );
}
