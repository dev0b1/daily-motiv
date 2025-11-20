"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaSpinner, FaMusic } from "react-icons/fa";
import { ConfettiPop } from "@/components/ConfettiPop";

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

  useEffect(() => {
    if (hasCheckedInToday) {
      fetchTodayMotivation();
    }
  }, [hasCheckedInToday, userId]);

  const fetchTodayMotivation = async () => {
    try {
      const response = await fetch(`/api/daily/check-in?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.checkIn?.motivationText) {
          setTodayMotivation(data.checkIn.motivationText);
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
          message: message.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMotivation(data.motivation);
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

  if (hasCheckedInToday && !motivation) {
    // show a compact summary by default to avoid taking over the UI; allow
    // the user to expand to view the full motivation text
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          className="card border-2 border-exroast-gold bg-gradient-to-br from-purple-900/20 to-black space-y-4 overflow-hidden"
        >
          <div className="flex items-start justify-between p-4 md:p-6">
            <div className="flex-1 text-left">
              <h3 className="text-lg md:text-xl font-black text-white">You Already Checked In Today ✅</h3>
              <p className="text-sm text-gray-300 mt-1">Nice! Keep that streak alive — comeback tomorrow to continue.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md text-sm"
                aria-expanded={expanded}
              >
                {expanded ? 'Collapse' : 'View'}
              </button>
            </div>
          </div>

          {expanded && (
            <div className="p-4 md:p-6 border-t border-white/5 max-h-[60vh] overflow-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {todayMotivation ? (
                  <div className="bg-white/5 border-2 border-exroast-gold rounded-xl p-6">
                    <p className="text-lg md:text-xl text-white leading-relaxed">
                      {todayMotivation}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-400">No saved motivation yet.</p>
                )}
              </motion.div>
            </div>
          )}
        </motion.div>
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
          className="card border-4 border-exroast-gold bg-gradient-to-br from-purple-900/30 to-black space-y-8"
        >
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-center bg-gradient-to-r from-purple-400 to-exroast-gold bg-clip-text text-transparent"
          >
            Your Daily Glow-Up 🔥
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 border-2 border-exroast-gold rounded-xl p-8"
          >
            <p className="text-xl md:text-2xl text-white leading-relaxed font-medium">
              {motivation}
            </p>
          </motion.div>

          <div className="space-y-4">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={handleConvertToSong}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary w-full text-lg md:text-xl py-6 flex items-center justify-center gap-3"
            >
              <FaMusic />
              <span>Turn This Into a Victory Song 🎵</span>
              <span className="text-sm bg-white/20 px-3 py-1 rounded-full font-black">
                1 CREDIT
              </span>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={handleDone}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full text-lg md:text-xl py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors"
            >
              Done – See You Tomorrow 🔥
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white">
            How are you feeling today? 💭
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 font-bold">
            Pick your mood and let it all out
          </p>
        </div>

        <div className="card space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {MOOD_OPTIONS.map((mood) => (
              <motion.button
                key={mood.id}
                onClick={() => setSelectedMood(mood.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`p-4 md:p-6 rounded-xl border-4 transition-all duration-300 ${
                  selectedMood === mood.id
                    ? `bg-gradient-to-br ${mood.color} border-white shadow-lg shadow-${mood.color.split('-')[1]}-500/50`
                    : "bg-white/5 border-white/20 hover:border-white/40"
                }`}
              >
                <div className="text-3xl md:text-4xl mb-2">{mood.emoji}</div>
                <div className="text-white font-bold text-xs md:text-sm">{mood.label}</div>
              </motion.button>
            ))}
          </div>

          <div>
            <label className="block text-white font-bold mb-3 text-lg md:text-xl">
              What's on your mind?
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Let it all out... what happened? How are you feeling?"
              className="w-full h-40 md:h-48 bg-black border-2 border-white/20 rounded-xl px-6 py-4 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none text-base md:text-lg"
              maxLength={500}
            />
            <div className="text-right text-gray-400 text-sm mt-2">
              {message.length}/500
            </div>
          </div>

          <motion.button
            onClick={handleGetMotivation}
            disabled={!selectedMood || !message.trim() || isLoading}
            whileHover={{ scale: selectedMood && message.trim() ? 1.05 : 1 }}
            whileTap={{ scale: selectedMood && message.trim() ? 0.95 : 1 }}
            className="w-full text-xl md:text-2xl py-6 md:py-8 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-xl font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-purple-500/50 transition-all duration-300"
          >
            {isLoading ? (
              <>
                <FaSpinner className="animate-spin" />
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
    </div>
  );
}
