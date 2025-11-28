"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FaSpinner, FaFire, FaPlay, FaDownload } from "react-icons/fa";
import RoastCreator from "@/components/RoastCreator";

interface RoastModeTabProps {
  userId: string;
}

export function RoastModeTab({ userId }: RoastModeTabProps) {
  const router = useRouter();
  const [previousHistory, setPreviousHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPreviousRoasts();
  }, [userId]);

  const fetchPreviousRoasts = async () => {
    try {
      const response = await fetch(`/api/user/roasts?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setPreviousHistory(data.roasts || []);
      }
    } catch (error) {
      console.error("Error fetching previous roasts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoast = async () => {
    // If not logged in, send to template flow (free users / anonymous)
    if (!userId) {
      router.push('/template');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/user/pro-status', {
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        // fallback to template
        router.push('/template');
        return;
      }

      const data = await res.json();

      if (data.isPro) {
        // Pro users go to the personalized roast creation page (story), pre-select roast mode
        router.push('/story?mode=petty');
      } else {
        // Free users get template previews
        router.push('/template');
      }
    } catch (error) {
      console.error('Error checking pro status:', error);
      router.push('/template');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Embedded Roast Creator (shared component) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <RoastCreator userId={userId} />
      </motion.div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <span className="text-white/30 font-bold text-xs md:text-sm">YOUR HISTORY</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Previous Roasts Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-6"
      >
        <div className="text-center space-y-2">
          <h3 className="text-2xl md:text-3xl font-black text-white">
            Your History
          </h3>
          <p className="text-base md:text-lg text-gray-400">
            {previousHistory.length > 0
              ? `${previousHistory.length} saved track${previousHistory.length !== 1 ? "s" : ""} ready to share`
              : "No entries yet – create your first one above!"}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <FaSpinner className="animate-spin text-orange-500 text-4xl" />
          </div>
        ) : previousHistory.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-center py-16">
            <div className="text-6xl md:text-7xl mb-4">🎵</div>
            <p className="text-lg md:text-xl text-gray-400 font-bold">
              Your entries will appear here
            </p>
            <p className="text-sm md:text-base text-gray-500 mt-2">
              Create your first entry to build your history
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {previousHistory.map((roast, index) => (
              <motion.div
                key={roast.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.03, y: -5 }}
                className="bg-black/60 backdrop-blur-xl border border-white/10 hover:border-white/20 cursor-pointer transition-all duration-300 rounded-lg p-4 md:p-5 shadow-lg"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-3xl md:text-4xl">🎵</div>
                    {roast.mode && (
                      <span className={`text-[10px] md:text-xs font-black px-2 py-1 rounded-md ${
                        roast.mode === "petty" 
                          ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}>
                        {roast.mode === "petty" ? "🔥 PETTY" : "👑 GLOW-UP"}
                      </span>
                    )}
                  </div>
                  
                  <h4 className="text-base md:text-lg font-bold text-white line-clamp-2 min-h-[3rem]">
                    {roast.title || "Untitled Entry"}
                  </h4>
                  
                  {roast.audioUrl ? (
                    <div className="space-y-3">
                      <audio
                        controls
                        className="w-full"
                        src={roast.audioUrl}
                        style={{
                          filter: "hue-rotate(320deg) saturate(1.5)",
                        }}
                      />
                      <div className="flex gap-2">
                        <button className="flex-1 bg-orange-600/80 hover:bg-orange-500 text-white px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors flex items-center justify-center gap-2">
                          <FaPlay className="text-xs" /> Play
                        </button>
                        <button className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors flex items-center justify-center gap-2">
                          <FaDownload className="text-xs" /> Share
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 rounded-md px-3 py-2 text-center border border-white/10">
                      <p className="text-xs text-gray-400">Audio not available</p>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 text-center pt-2 border-t border-white/5">
                    {new Date(roast.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}