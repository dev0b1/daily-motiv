"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaSpinner, FaMusic, FaFire } from "react-icons/fa";
import { ConfettiPop } from "@/components/ConfettiPop";
import { DailyQuoteOptInModal } from "@/components/DailyQuoteOptInModal";
import { UpsellModal } from "@/components/UpsellModal";

const MOOD_OPTIONS = [
  { id: "hurting", label: "Still hurting", emoji: "💔", color: "from-red-500 to-pink-500" },
  { id: "confidence", label: "Need confidence", emoji: "✨", color: "from-purple-500 to-pink-500" },
  { id: "angry", label: "Angry AF", emoji: "😤", color: "from-orange-500 to-red-600" },
  { id: "unstoppable", label: "Feeling unstoppable", emoji: "🚀", color: "from-green-500 to-blue-500" }
];

interface DailyCheckInTabProps {
  userId: string;
  onStreakUpdate: (newStreak: number) => void;
  hasCheckedInToday: boolean;
}

export function DailyCheckInTab({ userId, onStreakUpdate, hasCheckedInToday }: DailyCheckInTabProps) {
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [motivation, setMotivation] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [todayMotivation, setTodayMotivation] = useState<string>("");
  const [expanded, setExpanded] = useState<boolean>(false);
  const [showOptInModal, setShowOptInModal] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [demoAudioSrc, setDemoAudioSrc] = useState<string | null>(null);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const audioRef = typeof window !== 'undefined' ? (null as HTMLAudioElement | null) : null;
  let previewTimer: ReturnType<typeof setTimeout> | null = null;

  useEffect(() => {
    if (hasCheckedInToday) {
      fetchTodayMotivation();
    }
  }, [hasCheckedInToday, userId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/user/pro-status', { 
          headers: { 
            'Content-Type': 'application/json', 
            'x-user-id': userId 
          } 
        });
        if (res.ok) {
          const data = await res.json();
          setIsPro(!!data.isPro);
        }
      } catch (err) {
        console.error('Failed to fetch pro status:', err);
      }
    })();
  }, [userId]);

  const fetchTodayMotivation = async () => {
    try {
      const response = await fetch(`/api/daily/check-in?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.checkIn?.motivationText) {
          setTodayMotivation(data.checkIn.motivationText);
        }
        // if today has an audio nudge saved, surface it in the UI
        if (data.checkIn?.motivationAudioUrl) {
          setDemoAudioSrc(data.checkIn.motivationAudioUrl);
        }
      }
    } catch (error) {
      console.error("Error fetching today's motivation:", error);
    }
  };

  const handleGetMotivation = async () => {
    if (!selectedMood || !message.trim()) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/daily/motivation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          mood: selectedMood,
          message: message.trim(),
          preferAudio: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMotivation(data.motivation);
        // prefer server-generated audio when available, otherwise fall back to local demo file
        const serverAudio: string | null = data.motivationAudioUrl || null;
        if (serverAudio) {
          setDemoAudioSrc(serverAudio);
        } else {
          // pick demo nudge based on selected mood; file names live in public/demo-nudges/
          // filenames: hurting.mp3, confidence.mp3, angry.mp3, feeling-unstoppable.mp3
          const moodToFile = (m: string) => {
            if (!m) return 'hurting';
            if (m === 'unstoppable') return 'feeling-unstoppable';
            return m; // 'hurting', 'confidence', 'angry'
          };
          const fileName = moodToFile(selectedMood || data.mood || 'hurting');
          setDemoAudioSrc(`/demo-nudges/${fileName}.mp3`);
        }
        setShowConfetti(true);
        if (data.streak !== undefined) {
          onStreakUpdate(data.streak);
        }
      }
    } catch (error) {
      console.error("Error getting motivation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = () => {
    setMotivation(null);
    setSelectedMood("");
    setMessage("");
  };

  const handleConvertToSong = () => {
    alert("🎵 Victory Song feature coming soon! This will convert your motivation into an uplifting 30-second anthem for 1 credit.");
  };

  const handleOptIn = async (audioEnabled: boolean) => {
    try {
      await fetch('/api/daily-quotes/opt-in', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ userId, audioEnabled }) 
      });
    } catch (err) {
      console.error('Failed to opt in from Daily tab', err);
    }
    setShowOptInModal(false);
  };

  // Opt-in banner component
  const OptInBanner = () => (
    <div className="p-4 md:p-6 border-b border-white/10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-exroast-pink to-exroast-gold flex items-center justify-center">
            <FaFire className="text-white text-lg" />
          </div>
          <div>
            <div className="text-sm md:text-base text-white font-bold">Daily Petty Power-Ups 🔥</div>
            <div className="text-xs md:text-sm text-gray-400">Short text quotes delivered daily. Audio nudges available (Pro or limited free).</div>
          </div>
        </div>
        <button 
          onClick={() => setShowOptInModal(true)} 
          className="text-xs md:text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md transition-colors whitespace-nowrap"
        >
          Manage
        </button>
      </div>
    </div>
  );

  if (hasCheckedInToday && !motivation) {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          className="bg-black/60 backdrop-blur-xl border-2 border-exroast-gold rounded-lg shadow-xl overflow-hidden"
        >
          <OptInBanner />
          
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 p-4 md:p-6">
            <div className="flex-1 text-left">
              <h3 className="text-lg md:text-xl font-black text-white">You Already Checked In Today ✅</h3>
              <p className="text-sm md:text-base text-gray-300 mt-1">Nice! Keep that streak alive — comeback tomorrow to continue.</p>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
              aria-expanded={expanded}
            >
              {expanded ? 'Collapse' : 'View Today'}
            </button>
          </div>

          {expanded && (
            <div className="p-4 md:p-6 border-t border-white/10 max-h-[60vh] overflow-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {todayMotivation ? (
                  <div className="bg-white/5 border-2 border-exroast-gold rounded-lg p-4 md:p-6 space-y-4">
                    <p className="text-base md:text-lg lg:text-xl text-white leading-relaxed">
                      {todayMotivation}
                    </p>
                    {demoAudioSrc && (
                      <div>
                        <audio controls src={demoAudioSrc} className="w-full mt-2" />
                        <div className="text-xs text-gray-300 mt-2">Your saved audio nudge — full playback available.</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-4">No saved motivation yet.</p>
                )}
              </motion.div>
            </div>
          )}
        </motion.div>

        <DailyQuoteOptInModal 
          isOpen={showOptInModal} 
          onClose={() => setShowOptInModal(false)} 
          onOptIn={handleOptIn}
          isPro={isPro} 
        />
      </div>
    );
  }

  if (motivation) {
    return (
      <div className="max-w-4xl mx-auto">
        <ConfettiPop show={showConfetti} onComplete={() => setShowConfetti(false)} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/60 backdrop-blur-xl border-4 border-exroast-gold rounded-lg shadow-2xl p-6 md:p-8 space-y-6 md:space-y-8"
        >
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl md:text-5xl font-black text-center bg-gradient-to-r from-purple-400 to-exroast-gold bg-clip-text text-transparent"
          >
            Your Daily Glow-Up 🔥
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 border-2 border-exroast-gold rounded-lg p-6 md:p-8"
          >
            <p className="text-lg sm:text-xl md:text-2xl text-white leading-relaxed font-medium">
              {motivation}
            </p>
          </motion.div>

          {/* Demo nudge + petty powerups */}
          {demoAudioSrc && (
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1 w-full">
                <div className="bg-black/50 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <audio
                      ref={(el) => {
                        if (el) {
                          // attach play listener to cut at 15s
                          el.onplay = () => {
                            // clear any existing timer
                            if (previewTimer) clearTimeout(previewTimer as any);
                            previewTimer = setTimeout(() => {
                              try {
                                el.pause();
                                // show upsell once the 15s demo has played
                                setShowUpsellModal(true);
                              } catch (e) {
                                // ignore
                              }
                            }, 15000);
                          };
                          el.onpause = () => {
                            if (previewTimer) {
                              clearTimeout(previewTimer as any);
                              previewTimer = null;
                            }
                          };
                        }
                      }}
                      controls
                      src={demoAudioSrc}
                      className="w-full"
                    />
                  </div>
                  <div className="text-xs text-gray-300 mt-2">15s demo nudge — play to preview. Upgrade to Pro to unlock full personalized audio nudges.</div>
                </div>
              </div>

              <div className="w-full md:w-72">
                <OptInBanner />
              </div>
            </div>
          )}

          <div className="space-y-3 md:space-y-4">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={handleConvertToSong}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full text-base sm:text-lg md:text-xl py-5 md:py-6 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-lg font-black flex flex-col sm:flex-row items-center justify-center gap-2 md:gap-3 shadow-lg transition-all"
            >
              <span className="flex items-center gap-2">
                <FaMusic />
                <span>Turn This Into a Victory Song 🎵</span>
              </span>
              <span className="text-xs md:text-sm bg-white/20 px-3 py-1 rounded-full font-black">
                1 CREDIT
              </span>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={handleDone}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full text-base sm:text-lg md:text-xl py-4 md:py-5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors"
            >
              Done – See You Tomorrow 🔥
            </motion.button>
          </div>
        </motion.div>

        <UpsellModal
          isOpen={showUpsellModal}
          onClose={() => setShowUpsellModal(false)}
          onUpgrade={(tier) => {
            // navigate to checkout with desired tier
            window.location.href = `/checkout?tier=${tier === 'one-time' ? 'single' : 'premium'}`;
          }}
        />

        <DailyQuoteOptInModal 
          isOpen={showOptInModal} 
          onClose={() => setShowOptInModal(false)} 
          onOptIn={handleOptIn}
          isPro={isPro} 
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 md:space-y-8"
      >
        <div className="text-center space-y-3 md:space-y-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
            How are you feeling today? 💭
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-300 font-bold">
            Pick your mood and let it all out
          </p>
        </div>

        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
          <OptInBanner />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {MOOD_OPTIONS.map((mood) => (
              <motion.button
                key={mood.id}
                onClick={() => setSelectedMood(mood.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`p-4 md:p-6 rounded-lg border-2 md:border-4 transition-all duration-300 ${
                  selectedMood === mood.id
                    ? `bg-gradient-to-br ${mood.color} border-white shadow-lg`
                    : "bg-white/5 border-white/20 hover:border-white/40"
                }`}
              >
                <div className="text-3xl md:text-4xl mb-2">{mood.emoji}</div>
                <div className="text-white font-bold text-xs md:text-sm">{mood.label}</div>
              </motion.button>
            ))}
          </div>

          <div>
            <label className="block text-white font-bold mb-3 text-base md:text-lg lg:text-xl">
              What's on your mind?
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Let it all out... what happened? How are you feeling?"
              className="w-full h-40 md:h-48 bg-black/80 border-2 border-white/20 rounded-lg px-4 md:px-6 py-3 md:py-4 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none text-sm md:text-base lg:text-lg"
              maxLength={500}
            />
            <div className="text-right text-gray-400 text-xs md:text-sm mt-2">
              {message.length}/500
            </div>
          </div>

          <motion.button
            onClick={handleGetMotivation}
            disabled={!selectedMood || !message.trim() || isLoading}
            whileHover={{ scale: selectedMood && message.trim() ? 1.02 : 1 }}
            whileTap={{ scale: selectedMood && message.trim() ? 0.98 : 1 }}
            className="w-full text-lg sm:text-xl md:text-2xl py-5 md:py-6 lg:py-8 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-lg font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-purple-500/50 transition-all duration-300"
          >
            {isLoading ? (
              <>
                <FaSpinner className="animate-spin text-xl md:text-2xl" />
                <span>Getting Your Motivation...</span>
              </>
            ) : (
              <>
                <span>Get My Motivation</span>
                <span>🔥</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      <DailyQuoteOptInModal 
        isOpen={showOptInModal} 
        onClose={() => setShowOptInModal(false)} 
        onOptIn={handleOptIn}
        isPro={isPro} 
      />
    </div>
  );
}