"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { SubscriptionCTA } from "@/components/SubscriptionCTA";
// import { SubscriptionModal } from "@/components/SubscriptionModal";
import { UpsellModal } from "@/components/UpsellModal";
import { DailyQuoteOptInModal } from "@/components/DailyQuoteOptInModal";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { LyricsOverlay } from "@/components/LyricsOverlay";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { getSongObjectURL } from '../../lib/offline-store';
import Link from "next/link";
import { FaLock, FaDownload, FaPlay, FaPause, FaFire, FaDumbbell, FaTiktok, FaInstagram, FaWhatsapp, FaTwitter, FaLink } from "react-icons/fa";
import { getDailySavageQuote } from "@/lib/suno-nudge";
import { openSingleCheckout } from '@/lib/checkout';

interface Song {
  id: string;
  title: string;
  previewUrl: string;
  fullUrl: string;
  lyrics: string;
  style: string;
  story: string;
  isPurchased: boolean;
  isTemplate?: boolean;
}

export default function PreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const songId = searchParams.get("songId");
  
  const supabase = createClientComponentClient();

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [showDailyQuoteOptIn, setShowDailyQuoteOptIn] = useState(false);
  const [showPreGenModal, setShowPreGenModal] = useState(false);
  const [editedLyrics, setEditedLyrics] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [actualDuration, setActualDuration] = useState(10);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasShownModalRef = useRef(false);

  useEffect(() => {
    if (songId) {
      fetchSong(songId);
    }
  }, [songId]);

  // If there is a locally stored full audio for this song, use it.
  useEffect(() => {
    let mounted = true;
    const tryLoadLocal = async () => {
      if (!song) return;
      try {
        const url = await getSongObjectURL(song.id);
        if (mounted && url) {
          // If a local copy exists, override fullUrl and mark purchased locally
          setSong((s) => s ? ({ ...s, fullUrl: url, isPurchased: true }) : s);
        }
      } catch (e) {
        console.warn('Failed to load local audio', e);
      }
    };
    tryLoadLocal();
    return () => { mounted = false; };
  }, [song]);

  const fetchSong = async (id: string) => {
    try {
      const response = await fetch(`/api/song/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setSong(data.song);
        // Initialize edited lyrics for pre-generation modal
        setEditedLyrics(data.song?.lyrics ?? "");
        
        if (typeof window !== 'undefined') {
          const hasSeenDailyQuoteOptIn = localStorage.getItem('hasSeenDailyQuoteOptIn');
          if (!hasSeenDailyQuoteOptIn) {
            setTimeout(() => {
              setShowDailyQuoteOptIn(true);
            }, 2000);
          }
        }
      } else {
        console.error("Failed to fetch song");
      }
    } catch (error) {
      console.error("Error fetching song:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDailyQuoteOptIn = async (audioEnabled: boolean) => {
    const userId = songId || '';
    const testQuote = getDailySavageQuote(1);
    
    console.log('Daily Quote Opt-In Flow:');
    console.log('- User ID:', userId);
    console.log('- Audio Enabled:', audioEnabled);
    console.log('- Test Quote:', testQuote);
    
    if (audioEnabled) {
      console.log('- Audio Nudge URL: [Will be generated via Suno AI on daily schedule]');
      console.log('- Test Audio Generation: User would receive 15-20s motivational audio with lo-fi trap beats');
    }

    // If the user isn't authenticated (we don't have a UUID user id),
    // save the opt-in locally and avoid calling the server which expects a
    // real userId (uuid). This prevents server-side failures for anonymous
    // visitors.
    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || '');

    if (!isUuid(userId)) {
      // Save preferences locally for anonymous users
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenDailyQuoteOptIn', 'true');
        localStorage.setItem('dailyQuotesEnabled', 'true');
        localStorage.setItem('audioNudgesEnabled', audioEnabled ? 'true' : 'false');
        alert(`🔥 You're in! Daily motivational quotes activated locally.\n\nToday's quote: ${testQuote}\n\n${audioEnabled ? 'Audio nudges (local) enabled - upgrade to Pro for server-sent audio nudges!' : 'Text quotes only - upgrade to Pro for server audio nudges!'}`);
      }
      return;
    }

    try {
      const response = await fetch('/api/daily-quotes/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, audioEnabled })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Opt-in successful!');
        console.log('Test quote from API:', data.testQuote);
        console.log("Today's quote:", testQuote);

        if (typeof window !== 'undefined') {
          localStorage.setItem('hasSeenDailyQuoteOptIn', 'true');
          alert(`🔥 You're in! Daily motivational quotes activated.\n\nToday's quote: ${testQuote}\n\n${audioEnabled ? 'Audio nudges enabled - you\'ll get personalized 15s motivation with beats!' : 'Text quotes only - upgrade to Pro for audio nudges!'}`);
        }
      } else {
        console.error('Opt-in failed:', data.error);
        if (typeof window !== 'undefined') {
          alert('❌ Oops! Something went wrong. Please try again.');
        }
      }
    } catch (error) {
      console.error('Opt-in error:', error);
      if (typeof window !== 'undefined') {
        alert('❌ Network error. Please check your connection and try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] relative flex items-center justify-center">
        <LoadingAnimation message="Loading your track..." />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-[70vh] relative flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gradient">Track not found</h1>
          <p className="text-white">Please try generating a new track</p>
        </div>
      </div>
    );
  }

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // reset the shown-modal flag so replays can show the upsell again
      hasShownModalRef.current = false;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    setCurrentTime(current);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    
    // Show the upsell modal after preview ends for any unpurchased song.
    if (!song.isPurchased && !hasShownModalRef.current && typeof window !== 'undefined') {
      setTimeout(() => {
        setShowUpsellModal(true);
        try { localStorage.setItem('hasGeneratedFirstSong', 'true'); } catch (e) {}
        hasShownModalRef.current = true;
      }, 500);
      return;
    }
  };

  // Polling for pending guest purchases was removed per request —
  // purchases will be handled server-side and the client can refetch song state as needed.

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const loadedDuration = audioRef.current.duration;
    setActualDuration(loadedDuration);
    setDuration(loadedDuration);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Open the pre-generation modal (edit lyrics or use existing)
  const openPreGenModal = () => {
    setEditedLyrics(song?.lyrics ?? "");
    setGenMessage(null);
    setShowPreGenModal(true);
  };

  const closePreGenModal = () => {
    setShowPreGenModal(false);
    setIsGenerating(false);
    setGenMessage(null);
  };

  const handleGenerate = async (useOverride: boolean) => {
    if (!song) return;
    setIsGenerating(true);
    setGenMessage(null);
    try {
      const body: any = { story: song.story, style: song.style };
      if (useOverride) body.overrideLyrics = editedLyrics;

      // Attach userId when available so server can attribute the job.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) body.userId = user.id;
      } catch (e) {
        // ignore - unauthenticated guest
      }

      // If this browser has a pending guest credit token, include it so the server
      // can recognize/attribute the request. We will also consume the local token
      // optimistically on success to allow immediate generation without waiting for webhook.
      let localToken: string | null = null;
      try {
        localToken = typeof window !== 'undefined' ? localStorage.getItem('pendingCreditToken') : null;
        if (localToken) body.pendingCreditToken = localToken;
      } catch (e) {}

      const res = await fetch('/api/generate-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.success) {
        if (data.error === 'no_credits') {
          setGenMessage('No credits available. Please complete an upgrade and wait for webhook confirmation.');
        } else {
          setGenMessage(data.error || 'Generation failed. Please try again.');
        }
        setIsGenerating(false);
        return;
      }

      // Success: a song row + background job was enqueued. Inform the user.
      setGenMessage('Your personalized song has been queued — we will notify you when it is ready.');
      // If we consumed a local guest token, decrement pendingCredits and remove the token.
      if (localToken && typeof window !== 'undefined') {
        try {
          const existing = localStorage.getItem('pendingCredits');
          const existingNum = existing ? parseInt(existing, 10) : 0;
          const newNum = Math.max(0, existingNum - 1);
          localStorage.setItem('pendingCredits', String(newNum));
          localStorage.removeItem('pendingCreditToken');
        } catch (e) { console.warn('Failed to consume local pending credit token', e); }
      }
      setIsGenerating(false);
      // Close modal after a short delay
      setTimeout(() => {
        setShowPreGenModal(false);
        // Optionally navigate to app or refresh
        router.push('/app');
      }, 1200);
    } catch (error) {
      console.error('Generate error:', error);
      setGenMessage('Network error. Please try again.');
      setIsGenerating(false);
    }
  };

  let shareUrl = '';
  if (typeof window !== 'undefined') {
    if (song) {
      if (!song.isPurchased) {
        shareUrl = song.previewUrl ?? `${window.location.origin}/share/${song.id}`;
      } else {
        shareUrl = song.fullUrl ?? `${window.location.origin}/share/${song.id}`;
      }
    } else {
      // fallback to share by songId from query params when song object is not yet loaded
      shareUrl = `${window.location.origin}/share/${songId ?? ""}`;
    }
  }

  return (
    <div>
      <Header />
      <main className="pt-32 pb-20 relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-block"
            >
              <div className="text-6xl mb-4">🔥</div>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold text-gradient">
              Your Motivation Track is Ready!
            </h1>
            <p className="text-xl text-white">
              Your motivation track is ready! Listen and share 🔥
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="card bg-black">
                <h3 className="text-xl font-bold text-gradient mb-4">
                  Your Story
                </h3>
                <p className="text-white italic mb-4">"{song.story}"</p>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-exroast-gold text-black rounded-full text-sm font-medium">
                    {song.style.charAt(0).toUpperCase() + song.style.slice(1)} Vibe
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="card sticky top-24">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg text-gradient">{song.title}</h3>
                    {song.isTemplate ? (
                      <span className="text-xs bg-exroast-pink text-white px-3 py-1 rounded-full font-medium">
                        Demo (full)
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <LyricsOverlay 
                      lyrics={song.lyrics}
                      duration={song.isPurchased ? actualDuration : 10}
                      isPlaying={isPlaying}
                      currentTime={currentTime}
                    />
                  </div>

                  <div className="flex flex-col gap-3 mt-6 w-full">
                    <div className="flex items-center gap-4 w-full">
                      <button
                        onClick={togglePlay}
                        className="bg-exroast-pink text-white px-6 py-3 rounded-full font-bold flex-shrink-0"
                      >
                        {isPlaying ? <><FaPause className="inline mr-2"/> Pause</> : <><FaPlay className="inline mr-2"/> Play</>}
                      </button>

                      {/* Progress + timer: use full duration (no 20s cap) */}
                      <div className="flex-1 min-w-0">
                        <div className="w-full">
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden w-full">
                            <div
                              className="h-2 bg-exroast-pink"
                              style={{ width: `${Math.max(0, Math.min(100, (() => {
                                const maxDuration = (duration || actualDuration || 0);
                                const denom = maxDuration || 1;
                                return (currentTime / denom) * 100;
                              })()))}%`, transition: 'width 180ms linear' }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-300 mt-1">
                            {(() => {
                              const maxDuration = (duration || actualDuration || 0);
                              return (
                                <>
                                  <span>{formatTime(Math.min(currentTime, maxDuration || 0))}</span>
                                  <span>{formatTime(Math.ceil(maxDuration || 0))}</span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Downloads & upgrade: placed below to give horizontal space for controls */}
                    <div className="flex items-center gap-3">
                        <a href={song.previewUrl} download className="bg-white/10 text-white px-4 py-2 rounded-full font-bold inline-flex items-center gap-2 border border-white/10" style={{ transform: 'scale(0.87)' }}>
                          <FaDownload /> {song.isTemplate ? 'Download Full Demo' : 'Download Demo'}
                        </a>

                      {song?.isPurchased ? (
                        <a href={song.fullUrl} download className="bg-white text-black px-4 py-2 rounded-full font-bold inline-flex items-center gap-2" style={{ transform: 'scale(0.87)' }}>
                          <FaDownload /> Download Full MP3
                        </a>
                      ) : (
                        <button
                          onClick={() => setShowUpsellModal(true)}
                          className="bg-white/10 text-white px-4 py-2 rounded-full font-bold inline-flex items-center gap-2 border border-white/10"
                          title="Upgrade to download the full MP3"
                          style={{ transform: 'scale(0.87)' }}
                        >
                          <FaLock className="mr-2" /> Upgrade for Full MP3
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Use a clipped audio fragment for public demos to ensure playback stops at 20s.
                      Appending a media fragment (#t=0,20) encourages browsers to limit playback to that range.
                      Keep timeupdate handler as a safety net for browsers that don't honor fragments. */}
                  <audio
                    ref={audioRef}
                    // Play full demo for templates and public demos — no clipping
                    src={(song.fullUrl || song.previewUrl)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleAudioEnded}
                    className="hidden"
                  />

                  <div className="border-t border-white/10 pt-6">
                    <h4 className="text-sm font-semibold text-white mb-3">Share Your Track</h4>
                    {/* Social share: always allow sharing the preview/demo link. Full-song sharing is available after purchase. */}
                    <div className="flex flex-wrap gap-3">
                      <SocialShareButtons
                        url={shareUrl}
                        title={song.title}
                        message={song.isPurchased ? `I just paid $4.99 for a personalized motivation track and it’s the best money I’ve spent 🔥🎵` : `Check out this demo!`}
                      />
                      {!song.isPurchased && (
                        <button
                          onClick={() => setShowUpsellModal(true)}
                          className="bg-white/10 text-white px-6 py-3 rounded-full font-bold inline-flex items-center gap-2 border border-white/10"
                        >
                          <FaLock className="mr-2" /> Upgrade for Full MP3
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-black to-heartbreak-100 border-2 border-heartbreak-200">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <FaLock className="text-3xl text-exroast-gold" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gradient mb-2">
                  Get Your Personalized Track
                </h3>
                <p className="text-white mb-4">
                  This preview is a polished demo. Want a personalized version tailored to your story — with exclusive mastering and a downloadable MP3? Upgrade to get the full, personalized track delivered to you.
                </p>
                {!showSubscription && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/pricing')}
                    className="btn-primary rounded-none flex items-center space-x-2"
                  >
                    <FaDownload />
                    <span>Upgrade to Personalized</span>
                  </motion.button>
                )}
                {/* Allow users with credits (server-side) to request generation. If they don't have credits,
                    the server will return `no_credits` and we show guidance to upgrade and wait for webhook. */}
                <div className="mt-3">
                  <button
                    onClick={openPreGenModal}
                    className="bg-white/10 text-white px-4 py-2 rounded-none font-bold inline-flex items-center gap-2 border border-white/10"
                  >
                    <FaDownload />
                    <span>Generate Personalized Track</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showSubscription && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.5 }}
            >
              {/* Pass songId so single-song purchases attach custom_data for webhook fulfillment.
                  If pendingSinglePurchase is true, autoOpenSingle will cause SubscriptionCTA to
                  immediately open the single-song checkout. */}
              <SubscriptionCTA songId={song?.id} autoOpenSingle={false} />
            </motion.div>
          )}

          
        </motion.div>
      </div>
      </main>

      
      <UpsellModal
        isOpen={showUpsellModal}
        onClose={() => setShowUpsellModal(false)}
        onUpgrade={async (tier) => {
          console.log('Upgrading to:', tier);
          setShowUpsellModal(false);
          // For one-time purchases we open the single-song checkout directly
          // from the user's click. This keeps the flow explicit and avoids
          // any accidental auto-open behavior.
          if (tier === 'one-time') {
            try {
              await openSingleCheckout({ songId: song?.id });
            } catch (e) {
              console.error('Error opening single checkout from upsell:', e);
            }
          } else {
            setShowSubscription(true);
          }
        }}
      />

      {/* Pre-generation modal: let user edit lyrics or generate from existing */}
      {showPreGenModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closePreGenModal} />
          <div className="relative max-w-3xl w-full bg-black border border-white/10 rounded-lg p-6 z-10">
            <h3 className="text-xl font-bold text-white mb-2">Prepare Your Personalized Song</h3>
            <p className="text-sm text-gray-300 mb-4">Edit the lyrics below, or leave as-is to let the AI generate final lyrics from your story.</p>

            <textarea
              value={editedLyrics}
              onChange={(e) => setEditedLyrics(e.target.value)}
              rows={8}
              className="w-full bg-white/5 text-white p-3 rounded-md mb-4"
            />

            {genMessage && (
              <div className="text-sm text-yellow-300 mb-3">{genMessage}</div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button onClick={closePreGenModal} className="px-4 py-2 bg-white/5 text-white rounded">Cancel</button>
              <button
                onClick={() => handleGenerate(false)}
                disabled={isGenerating}
                className="px-4 py-2 bg-exroast-pink text-white rounded font-bold"
              >
                {isGenerating ? 'Generating...' : 'Generate (AI lyrics)'}
              </button>
              <button
                onClick={() => handleGenerate(true)}
                disabled={isGenerating || !editedLyrics || editedLyrics.trim().length < 10}
                className="px-4 py-2 bg-white text-black rounded font-bold"
              >
                {isGenerating ? 'Generating...' : 'Generate (use edited lyrics)'}
              </button>
            </div>
          </div>
        </div>
      )}

      <DailyQuoteOptInModal
        isOpen={showDailyQuoteOptIn}
        onClose={() => {
          setShowDailyQuoteOptIn(false);
          if (typeof window !== 'undefined') {
            localStorage.setItem('hasSeenDailyQuoteOptIn', 'true');
          }
        }}
        onOptIn={handleDailyQuoteOptIn}
        isPro={song?.isPurchased || false}
      />
      {/* Mobile Bottom Navigation Bar (replicated from app/page.tsx for preview route) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-lg border-t border-white/20 h-20">
        <div className="h-full flex items-stretch">
          <Link
            href="/app?tab=history"
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 text-gray-400`}
          >
            <FaFire className="text-2xl" />
            <span className="text-xs font-bold">History</span>
          </Link>

          <Link
            href="/app?tab=daily"
            className="w-32 flex flex-col items-center justify-center bg-gradient-to-t from-purple-900/20 to-transparent border-x border-white/10"
          >
            <div className="text-lg font-black text-white leading-tight">Day</div>
            <div className="text-xs text-gray-400 font-bold">strong</div>
          </Link>

          <Link
            href="/app?tab=daily"
            className={`relative flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 text-gray-400`}
          >
            <FaDumbbell className="text-2xl" />
            <span className="text-xs font-bold">Daily</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
