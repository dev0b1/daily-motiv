"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FaSpinner, FaFire, FaPlay, FaDownload } from "react-icons/fa";

interface RoastModeTabProps {
  userId: string;
}

export function RoastModeTab({ userId }: RoastModeTabProps) {
  const router = useRouter();
  const [previousRoasts, setPreviousRoasts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPreviousRoasts();
  }, [userId]);

  const fetchPreviousRoasts = async () => {
    try {
      const response = await fetch(`/api/user/roasts?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setPreviousRoasts(data.roasts || []);
      }
    } catch (error) {
      console.error("Error fetching previous roasts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Create New Roast Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-exroast-pink via-orange-500 to-red-600 bg-clip-text text-transparent">
            Create Your Savage Roast 🔥
          </h2>
          <p className="text-xl md:text-2xl text-white font-bold">
            30-second AI diss track that ends them
          </p>
        </div>

        <div className="card bg-gradient-to-br from-red-900/20 via-black to-black border-2 border-exroast-pink">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-exroast-pink/20 to-red-600/20 border-2 border-exroast-pink rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🗡️</div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-white mb-2">
                    Ready to roast?
                  </h3>
                  <p className="text-white/80">
                    Head to the full roast creation experience where you can spill the tea, pick your vibe (Petty Roast or Glow-Up Flex), and get your 30-second banger.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push("/app")}
              className="btn-primary w-full text-xl md:text-2xl py-6 md:py-8 flex items-center justify-center gap-4 bg-gradient-to-r from-exroast-pink to-red-600 hover:from-pink-500 hover:to-red-500 shadow-lg shadow-exroast-pink/50"
            >
              <span>Spill the Tea & Create Roast</span>
              <FaFire className="text-3xl" />
            </button>
            
            <p className="text-center text-gray-400 text-sm">
              Takes you to the full roast creation experience with OCR, style selection, and audio preview
            </p>
          </div>
        </div>
      </motion.div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <span className="text-white/40 font-bold">YOUR SAVAGE LIBRARY</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* Previous Roasts Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-6"
      >
        <div className="text-center space-y-2">
          <h3 className="text-3xl md:text-4xl font-black text-white">
            Previous Roasts
          </h3>
          <p className="text-lg text-gray-400">
            {previousRoasts.length > 0
              ? `${previousRoasts.length} savage track${previousRoasts.length !== 1 ? "s" : ""} ready to share`
              : "No roasts yet – create your first masterpiece above!"}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <FaSpinner className="animate-spin text-exroast-gold text-4xl" />
          </div>
        ) : previousRoasts.length === 0 ? (
          <div className="card text-center py-16 bg-white/5">
            <div className="text-7xl mb-4">🎵</div>
            <p className="text-xl text-gray-400 font-bold">
              Your roasts will appear here
            </p>
            <p className="text-gray-500 mt-2">
              Create your first one to build your savage library
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {previousRoasts.map((roast, index) => (
              <motion.div
                key={roast.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="card border-2 border-exroast-pink hover:border-exroast-gold cursor-pointer transition-all duration-300 bg-gradient-to-br from-red-900/10 to-black"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-4xl">🎵</div>
                    {roast.mode && (
                      <span className={`text-xs font-black px-2 py-1 rounded-full ${
                        roast.mode === "petty" 
                          ? "bg-exroast-pink/20 text-exroast-pink" 
                          : "bg-exroast-gold/20 text-exroast-gold"
                      }`}>
                        {roast.mode === "petty" ? "🔥 PETTY" : "👑 GLOW-UP"}
                      </span>
                    )}
                  </div>
                  
                  <h4 className="text-lg md:text-xl font-black text-white line-clamp-2 min-h-[3.5rem]">
                    {roast.title || "Untitled Roast"}
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
                        <button className="flex-1 bg-exroast-pink/20 hover:bg-exroast-pink/30 text-exroast-pink px-3 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
                          <FaPlay className="text-xs" /> Play
                        </button>
                        <button className="flex-1 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
                          <FaDownload className="text-xs" /> Share
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-gray-400">Audio not available</p>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-400 text-center pt-2 border-t border-white/10">
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
