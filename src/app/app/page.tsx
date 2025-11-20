"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { DailyCheckInTab } from "@/components/DailyCheckInTab";
import { RoastModeTab } from "@/components/RoastModeTab";
import { FaSpinner, FaFire, FaDumbbell } from "react-icons/fa";

type Tab = "daily" | "roast";

export default function AppPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [currentTab, setCurrentTab] = useState<Tab>("daily");
  const [user, setUser] = useState<any>(null);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth?redirectTo=/app");
        return;
      }
      setUser(session.user);
      setUserAvatar(session.user.user_metadata?.avatar_url || "");
      await Promise.all([
        fetchStreak(session.user.id),
        checkTodayCheckIn(session.user.id)
      ]);
      setIsLoading(false);
    };

    checkUser();
  }, [router, supabase]);

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
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const getFireEmojis = (streakCount: number) => {
    const count = Math.min(Math.ceil(streakCount / 3), 10);
    return "🔥".repeat(count || 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <FaSpinner className="animate-spin text-exroast-gold text-6xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative pb-24 md:pb-0">
      <AnimatedBackground />
      
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-lg border-b-2 border-exroast-gold">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-black text-gradient">
              ExRoast.fm 🔥
            </h1>
            
            {/* Profile Avatar Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                {userAvatar ? (
                  <img 
                    src={userAvatar} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full border-2 border-exroast-gold"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-exroast-pink to-exroast-gold flex items-center justify-center text-white font-black">
                    {user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-black border-2 border-exroast-gold rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl">
                <div className="p-3 border-b border-white/10">
                  <p className="text-white font-bold text-sm truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => router.push("/account")}
                  className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors"
                >
                  Account Settings
                </button>
                <button
                  onClick={() => router.push("/history")}
                  className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors"
                >
                  History
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left text-red-400 hover:bg-white/10 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Massive Streak Counter */}
      <div className="fixed top-20 left-0 right-0 z-40 bg-gradient-to-b from-black via-black/95 to-transparent backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 150, delay: 0.2 }}
            className="text-center relative"
          >
            {!hasCheckedInToday && (
              <motion.button
                onClick={() => setCurrentTab("daily")}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-black flex items-center gap-2 shadow-lg hover:bg-red-500 transition-colors"
              >
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Check in now →
              </motion.button>
            )}
            
            <motion.div
              key={streak}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black leading-none"
            >
              <span className="bg-gradient-to-r from-exroast-gold via-orange-500 to-exroast-pink bg-clip-text text-transparent">
                Day {streak}
              </span>
              {" "}
              <span className="text-white">strong</span>
              <div className="mt-4 text-5xl sm:text-6xl md:text-7xl lg:text-8xl">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-block"
                >
                  {getFireEmojis(streak)}
                </motion.span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Desktop Tab Navigation */}
      <div className="hidden md:block fixed top-72 left-0 right-0 z-30 bg-black/90 backdrop-blur-md border-b-2 border-white/10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentTab("daily")}
              className={`relative flex-1 py-5 px-6 rounded-t-xl font-black text-xl transition-all duration-300 ${
                currentTab === "daily"
                  ? "bg-gradient-to-r from-purple-600 to-purple-800 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <FaDumbbell /> Daily Check-In
              </span>
              {!hasCheckedInToday && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setCurrentTab("roast")}
              className={`flex-1 py-5 px-6 rounded-t-xl font-black text-xl transition-all duration-300 ${
                currentTab === "roast"
                  ? "bg-gradient-to-r from-exroast-pink to-red-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <FaFire /> Roast Mode
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className={`relative z-10 pt-96 md:pt-[400px] px-4 ${
        currentTab === "daily" 
          ? "bg-gradient-to-b from-transparent via-purple-900/20 to-purple-900/30" 
          : "bg-gradient-to-b from-transparent via-red-900/20 to-black"
      }`}>
        <AnimatePresence mode="wait">
          {currentTab === "daily" && (
            <motion.div
              key="daily"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <RoastModeTab userId={user?.id} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black border-t-2 border-white/20 backdrop-blur-lg">
        <div className="flex items-stretch h-20">
          <button
            onClick={() => setCurrentTab("roast")}
            className={`relative flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
              currentTab === "roast"
                ? "bg-gradient-to-t from-red-600/30 to-transparent text-exroast-pink"
                : "text-gray-400"
            }`}
          >
            <FaFire className="text-2xl" />
            <span className="text-xs font-bold">Roast</span>
          </button>
          
          <div className="w-24 flex items-center justify-center bg-gradient-to-t from-exroast-gold/20 to-transparent">
            <div className="text-center">
              <div className="text-3xl font-black text-gradient leading-none">
                {streak}
              </div>
              <div className="text-xs text-white font-bold mt-1">🔥</div>
            </div>
          </div>
          
          <button
            onClick={() => setCurrentTab("daily")}
            className={`relative flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
              currentTab === "daily"
                ? "bg-gradient-to-t from-purple-600/30 to-transparent text-purple-400"
                : "text-gray-400"
            }`}
          >
            {!hasCheckedInToday && (
              <span className="absolute top-2 right-6 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
            <FaDumbbell className="text-2xl" />
            <span className="text-xs font-bold">Daily</span>
          </button>
        </div>
      </div>
    </div>
  );
}
