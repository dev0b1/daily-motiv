"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from "next/navigation";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { DailyCheckInTab } from "@/components/DailyCheckInTab";
import { RoastModeTab } from "@/components/RoastModeTab";
import { ConfettiPop } from "@/components/ConfettiPop";
import { FaSpinner, FaFire, FaDumbbell } from "react-icons/fa";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StyleSelector, SongStyle } from "@/components/StyleSelector";
import LoadingProgress, { LoadingStep } from "@/components/LoadingProgress";
import { SparkStorm } from "@/components/SparkStorm";
import { Tooltip } from "@/components/Tooltip";

type Tab = "daily" | "roast";

export default function TemplatePage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Reuse the same UI as /app but allow anonymous users. If a session exists
  // we'll initialize user-specific data; otherwise operate in guest mode.
  const [currentTab, setCurrentTab] = useState<Tab>("daily");
  const [user, setUser] = useState<any>(null);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  // Template-specific inputs for anonymous roast generation
  const [story, setStory] = useState("");
  const [style, setStyle] = useState<SongStyle>("petty");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('lyrics');
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    // Allow ?tab=roast or ?tab=daily to pre-select the tab when linking
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search || '');
        const tabParam = params.get('tab');
        if (tabParam === 'roast' || tabParam === 'daily') {
          setCurrentTab(tabParam as Tab);
        }
      } catch (e) {
        // ignore
      }
    }

    let mounted = true;
    let authSubscription: any = null;

    const initUser = async (sessionUser: any) => {
      if (!mounted) return;
      setUser(sessionUser);
      setUserAvatar(sessionUser.user_metadata?.avatar_url || "");
      await Promise.all([
        fetchStreak(sessionUser.id),
        checkTodayCheckIn(sessionUser.id)
      ]);
      setIsLoading(false);
    };

    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('[template] supabase session error', error.message);
        }

        if (session?.user) {
          await initUser(session.user);
        } else {
          // Guest mode: don't redirect, just show the template UI without user data
          setIsLoading(false);
        }

        // Subscribe to auth state changes (keep reference to unsubscribe)
        const { data: subscription } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;
            if (event === 'SIGNED_IN' && session?.user) {
              await initUser(session.user);
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
            }
          }
        );

        authSubscription = subscription;

      } catch (err) {
        console.error('[template/page] Auth error:', err);
        setIsLoading(false);
      }
    };

    checkUser();

    return () => { 
      mounted = false;
      authSubscription?.unsubscribe?.();
    };
  }, [router, supabase]);

  // close profile menu when clicking outside (so mobile taps will dismiss)
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const el = profileRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const fetchStreak = async (userId: string) => {
    try {
      const response = await fetch(`/api/user/streak?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setStreak(data.currentStreak || 0);
      }
    } catch (error) {
      console.error("Error fetching streak:", error);
    }
  };

  const checkTodayCheckIn = async (userId: string) => {
    try {
      const response = await fetch(`/api/daily/check-in?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setHasCheckedInToday(!!data.checkIn);
      }
    } catch (error) {
      console.error("Error checking today's check-in:", error);
    }
  };

  const handleStreakUpdate = (newStreak: number) => {
    setStreak(newStreak);
    setHasCheckedInToday(true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3200);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
  };

  // Template generation handlers (same as previous template page)
  const handleGenerate = async () => {
    if (story.trim().length < 10) {
      alert("Spill more tea! We need at least 10 characters to roast properly 🔥");
      return;
    }

    setIsGenerating(true);
    setLoadingStep('lyrics');
    setLoadingProgress(0);

    try {
      const extractedText = story;

      setLoadingStep('lyrics');
      setLoadingProgress(30);

      const endpoint = "/api/generate-preview";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          story: extractedText,
          style,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setLoadingStep('complete');
        setLoadingProgress(100);

        setShowConfetti(true);

        if (typeof window !== 'undefined') {
          let recentRoasts = [] as any[];
          try {
            const raw = localStorage.getItem('recentRoasts');
            if (raw) recentRoasts = JSON.parse(raw);
            if (!Array.isArray(recentRoasts)) recentRoasts = [];
          } catch (err) {
            console.warn('Invalid recentRoasts in localStorage, resetting it.', err, localStorage.getItem('recentRoasts'));
            recentRoasts = [];
          }

          recentRoasts.unshift({
            id: data.songId,
            title: data.title,
            timestamp: new Date().toISOString()
          });
          localStorage.setItem('recentRoasts', JSON.stringify(recentRoasts.slice(0, 3)));
        }

        setTimeout(() => {
          router.push(`/preview?songId=${data.songId}`);
        }, 1500);
      } else {
        throw new Error(data.error || "Failed to generate preview");
      }
    } catch (error) {
      console.error("Error generating preview:", error);
      alert(`Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
      setIsGenerating(false);
    }
  };

  if (isLoading || isGenerating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <AnimatedBackground />
        <div className="relative z-10">
          {isGenerating ? (
            <LoadingProgress currentStep={loadingStep} progress={loadingProgress} />
          ) : (
            <FaSpinner className="animate-spin text-exroast-gold text-6xl" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative pb-20 md:pb-0">
      <AnimatedBackground />
      <SparkStorm />
      <Header />

      {/* Fixed Streak Bar (guest mode shows generic text) */}
      <div className="fixed top-14 md:top-16 left-0 right-0 z-40 bg-gradient-to-r from-purple-900/80 via-purple-700/70 to-amber-500/60 backdrop-blur-md border-b-2 border-amber-500/30 h-16 md:h-[70px] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-full flex flex-col justify-center">
          <div className="flex items-center justify-between md:justify-start gap-4">
            <div className="flex-1 md:flex-initial">
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white leading-tight drop-shadow-lg">
                {user ? (streak === 0 ? 'Ready to start your streak today?' : `Day ${streak} strong`) : 'Generate a mock roast — no sign-in required'}
              </h2>
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl drop-shadow-lg">
              {user ? (streak > 0 ? '🔥'.repeat(Math.min(streak, 12)) : '') : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Tab Navigation */}
      <div className="hidden md:block fixed top-[106px] lg:top-[118px] left-0 right-0 z-40 bg-black/95 border-b-2 border-white/10 shadow-xl">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center gap-8">
            <button
              onClick={() => setCurrentTab("roast")}
              className={`relative px-8 py-4 font-black text-lg transition-all duration-200 ${
                currentTab === "roast"
                  ? "text-exroast-pink border-b-4 border-exroast-pink"
                  : "text-gray-500 hover:text-white border-b-4 border-transparent"
              }`}
            >
              <span className="flex items-center gap-2">🔥 Roast Mode</span>
            </button>
            <button
              onClick={() => setCurrentTab("daily")}
              className={`relative px-8 py-4 font-black text-lg transition-all duration-200 ${
                currentTab === "daily"
                  ? "text-purple-400 border-b-4 border-purple-400"
                  : "text-gray-500 hover:text-white border-b-4 border-transparent"
              }`}
            >
              <span className="flex items-center gap-3">💪 Daily Glow-Up</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main className="pt-32 md:pt-40 lg:pt-48 px-3 sm:px-4 md:px-6 pb-8 relative z-10">
        <div className={`max-w-5xl mx-auto transition-colors duration-300 ${
          currentTab === "daily" 
            ? "bg-gradient-to-b from-purple-900/30 via-purple-800/20 to-purple-900/30" 
            : "bg-gradient-to-b from-red-900/30 via-red-800/20 to-black/60"
        } rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl border border-white/10`}>
          <AnimatePresence mode="wait">
            {currentTab === "daily" && (
              <motion.div
                key="daily"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <DailyCheckInTab 
                  userId={user?.id} 
                  onStreakUpdate={handleStreakUpdate}
                  hasCheckedInToday={hasCheckedInToday}
                />
              </motion.div>
            )}
            {currentTab === "roast" && (
              <motion.div
                key="roast"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <RoastModeTab userId={user?.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-lg border-t border-white/20 h-20">
        <div className="h-full flex items-stretch">
          <button
            onClick={() => setCurrentTab("roast")}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
              currentTab === "roast"
                ? "bg-gradient-to-t from-red-600/20 to-transparent text-exroast-pink"
                : "text-gray-400"
            }`}
          >
            <FaFire className="text-2xl" />
            <span className="text-xs font-bold">Roast</span>
          </button>
          <button
            onClick={() => setCurrentTab("daily")}
            className="w-32 flex flex-col items-center justify-center bg-gradient-to-t from-purple-900/20 to-transparent border-x border-white/10"
          >
            <div className="text-lg font-black text-white leading-tight">Day {streak}</div>
            <div className="text-xs text-gray-400 font-bold">strong</div>
            <div className="text-base mt-0.5">{streak > 0 ? '🔥'.repeat(Math.min(streak, 12)) : ''}</div>
          </button>
          <button
            onClick={() => setCurrentTab("daily")}
            className={`relative flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
              currentTab === "daily"
                ? "bg-gradient-to-t from-purple-600/20 to-transparent text-purple-400"
                : "text-gray-400"
            }`}
          >
            <FaDumbbell className="text-2xl" />
            <span className="text-xs font-bold">Daily</span>
          </button>
        </div>
      </nav>

      {showConfetti && <ConfettiPop show={showConfetti} onComplete={() => setShowConfetti(false)} />}
      <Footer />
    </div>
  );
}
