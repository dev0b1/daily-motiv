"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from 'next/navigation';
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { SubscriptionCTA } from "@/components/SubscriptionCTA";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { UpsellModal } from "@/components/UpsellModal";
import { DailyQuoteOptInModal } from "@/components/DailyQuoteOptInModal";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { LyricsOverlay } from "@/components/LyricsOverlay";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { getSongObjectURL, saveSongAudio, getSongAudio } from '@/lib/offline-store';
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
  
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [showDailyQuoteOptIn, setShowDailyQuoteOptIn] = useState(false);
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
        alert(`🔥 You're in! Daily savage quotes activated locally.\n\nToday's quote: ${testQuote}\n\n${audioEnabled ? 'Audio nudges (local) enabled - upgrade to Pro for server-sent audio nudges!' : 'Text quotes only - upgrade to Pro for server audio nudges!'}`);
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
        console.log("Today's savage quote:", testQuote);

        if (typeof window !== 'undefined') {
          localStorage.setItem('hasSeenDailyQuoteOptIn', 'true');
          alert(`🔥 You're in! Daily savage quotes activated.\n\nToday's quote: ${testQuote}\n\n${audioEnabled ? 'Audio nudges enabled - you\'ll get personalized 15s motivation with beats!' : 'Text quotes only - upgrade to Pro for audio nudges!'}`);
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
        <LoadingAnimation message="Loading your song..." />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-[70vh] relative flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gradient">Song not found</h1>
          <p className="text-white">Please try generating a new song</p>
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
    // No truncation: templates (demos) and purchased songs play fully.
    // We simply update the current time and let the audio end naturally.
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    
    // Show subscription modal for first-time users after preview ends
    // Only for unpurchased songs
    if (!song.isPurchased && !hasShownModalRef.current && typeof window !== 'undefined') {
      // Prioritize first-time modal for anonymous first generation
      const hasGeneratedFirstSong = localStorage.getItem('hasGeneratedFirstSong');
      if (!hasGeneratedFirstSong) {
        setTimeout(() => {
          setShowFirstTimeModal(true);
          try { localStorage.setItem('hasGeneratedFirstSong', 'true'); } catch (e) {}
          hasShownModalRef.current = true;
        }, 500);
        return;
      }

      // If this is a demo/template track, always show the upsell modal after it finishes.
      // We allow it on every replay by resetting hasShownModalRef when playback starts.
      if (song.isTemplate) {
        setTimeout(() => {
          setShowUpsellModal(true);
          hasShownModalRef.current = true;
        }, 500);
        return;
      }
    }
  };

  // If a pending single-song purchase exists for this song (guest flow), poll for webhook fulfillment
  useEffect(() => {
    let polling = true;
    let attempts = 0;

    const pendingId = typeof window !== 'undefined' ? localStorage.getItem('pendingSingleSongId') : null;
    if (!pendingId || !song || pendingId !== song.id) return;

    const poll = async () => {
      while (polling && attempts < 40) {
        attempts++;
        try {
          const res = await fetch(`/api/song/${song.id}`);
          if (res.ok) {
            const body = await res.json();
            if (body.success && body.song && body.song.isPurchased && body.song.fullUrl) {
              // Fetch full audio and store it locally
              try {
                const audioRes = await fetch(body.song.fullUrl);
                const blob = await audioRes.blob();
                await saveSongAudio(song.id, blob);
                const objectUrl = URL.createObjectURL(blob);
                setSong((s) => s ? ({ ...s, fullUrl: objectUrl, isPurchased: true }) : s);
                try { localStorage.removeItem('pendingSingleSongId'); } catch (e) {}
                break;
              } catch (e) {
                console.warn('Failed to fetch and store full audio', e);
              }
            }
          }
        } catch (e) {
          console.debug('Polling /api/song failed:', e);
        }

        await new Promise((r) => setTimeout(r, 3000));
      }
    };

    poll();

    return () => { polling = false; };
  }, [song]);

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const loadedDuration = audioRef.current.duration;
    setActualDuration(loadedDuration);
    // Always use the real loaded duration; there is no preview truncation.
    setDuration(loadedDuration);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const shareUrl = typeof window !== 'undefined'
    ? (song
        ? (!song.isPurchased
            ? song.previewUrl || `${window.location.origin}/share/${song.id}`
            : song.fullUrl || `${window.location.origin}/share/${song.id}`)
        : `${window.location.origin}/share/${song?.id}`)
    : '';

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
              Your Song is Ready!
            </h1>
            <p className="text-xl text-white">
              Your savage roast is ready! Listen and share 🔥
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="card bg-black">
                <h3 className="text-xl font-bold text-gradient mb-4">
                  Your Breakup Story
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

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
                    <button
                      onClick={togglePlay}
                      className="bg-exroast-pink text-white px-6 py-3 rounded-full font-bold"
                    >
                      {isPlaying ? <><FaPause className="inline mr-2"/> Pause</> : <><FaPlay className="inline mr-2"/> Play</>}
                    </button>

                    {/* Allow downloading the 20s preview/demo for free users */}
                    <a href={song.previewUrl} download className="bg-white/10 text-white px-6 py-3 rounded-full font-bold inline-flex items-center gap-2 border border-white/10">
                      <FaDownload /> Download 20s Demo
                    </a>

                    {/* Full MP3 download remains locked until purchase */}
                    {song?.isPurchased ? (
                      <a href={song.fullUrl} download className="bg-white text-black px-6 py-3 rounded-full font-bold inline-flex items-center gap-2">
                        <FaDownload /> Download Full MP3
                      </a>
                    ) : (
                      <button
                        onClick={() => setShowUpsellModal(true)}
                        className="bg-white/10 text-white px-6 py-3 rounded-full font-bold inline-flex items-center gap-2 border border-white/10"
                        title="Upgrade to download the full MP3"
                      >
                        <FaLock className="mr-2" /> Full MP3
                      </button>
                    )}
                  </div>

                  <audio
                    ref={audioRef}
                    src={song.isPurchased ? song.fullUrl : song.previewUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleAudioEnded}
                    className="hidden"
                  />

                  <div className="border-t border-white/10 pt-6">
                    <h4 className="text-sm font-semibold text-white mb-3">Share Your Song</h4>
                    {/* Social share: always allow sharing the preview/demo link. Full-song sharing is available after purchase. */}
                    <div className="flex flex-wrap gap-3">
                      <SocialShareButtons
                        url={shareUrl}
                        title={song.title}
                        message={song.isPurchased ? `I just paid $4.99 to have my ex roasted by AI and it’s the best money I’ve ever spent 🔥🎵` : `Check out this 20s savage demo!`}
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
                  Get Your Personalized Song
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

      <SubscriptionModal 
        isOpen={showFirstTimeModal} 
        onClose={() => setShowFirstTimeModal(false)} 
      />
      
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
            href="/app?tab=roast"
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 text-gray-400`}
          >
            <FaFire className="text-2xl" />
            <span className="text-xs font-bold">Roast</span>
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
