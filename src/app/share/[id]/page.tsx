"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import AuthAwareCTA from "@/components/AuthAwareCTA";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { LyricsOverlay } from "@/components/LyricsOverlay";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { FaPlay, FaPause, FaDownload, FaLock } from "react-icons/fa";

interface Song {
  id: string;
  title: string;
  previewUrl: string;
  fullUrl: string;
  lyrics: string;
  style: string;
  story: string;
  isPurchased: boolean;
}

export default function SharePage() {
  const params = useParams();
  const songId = params.id as string;
  
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [actualDuration, setActualDuration] = useState(10);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (songId) {
      fetchSong(songId);
    }
  }, [songId]);

  const fetchSong = async (id: string) => {
    try {
      const response = await fetch(`/api/song/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setSong(data.song);
      }
    } catch (error) {
      console.error("Error fetching song:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative flex items-center justify-center">
        <AnimatedBackground />
          <div className="relative z-10">
            <LoadingAnimation message="Loading track..." />
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-black relative">
        <AnimatedBackground />
        <Header />
        <main className="pt-32 pb-20 relative z-10">
          <div className="max-w-3xl mx-auto px-4 text-center">
              <h1 className="text-3xl font-bold text-gradient mb-4">
              Track not found
            </h1>
            <p className="text-white mb-8">
              This track may have been deleted or the link is invalid.
            </p>
            <AuthAwareCTA className="btn-primary">Create Your Own Track</AuthAwareCTA>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    setCurrentTime(current);

    if (!song.isPurchased && current >= 10) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const loadedDuration = audioRef.current.duration;
    setActualDuration(loadedDuration);
    setDuration(song.isPurchased ? loadedDuration : 10);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-screen bg-black relative">
      <AnimatedBackground />
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
              >
                <div className="text-6xl mb-4">🔥</div>
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-bold text-gradient">
                {song.title}
              </h1>
              <p className="text-xl text-white">
                An AI-powered motivation track
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <LyricsOverlay 
                  lyrics={song.lyrics} 
                  duration={song.isPurchased ? actualDuration : 10}
                  isPlaying={isPlaying}
                />

                <div className="card">
                  <h3 className="text-xl font-bold text-gradient mb-4">
                    The Story Behind the Track
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
                      <h3 className="font-semibold text-lg text-gradient">Track Preview</h3>
                      {!song.isPurchased && (
                        <span className="text-xs bg-exroast-pink text-white px-3 py-1 rounded-full font-medium">
                          Preview (10s)
                        </span>
                      )}
                    </div>

                    <audio
                      ref={audioRef}
                      src={song.isPurchased ? song.fullUrl : song.previewUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={() => setIsPlaying(false)}
                    />

                    <div className="flex items-center space-x-4">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={togglePlay}
                        className="w-14 h-14 rounded-full bg-exroast-pink hover:bg-exroast-gold text-white flex items-center justify-center transition-colors flex-shrink-0"
                      >
                        {isPlaying ? <FaPause className="text-xl" /> : <FaPlay className="text-xl ml-1" />}
                      </motion.button>

                      <div className="flex-1">
                        <input
                          type="range"
                          min="0"
                          max={duration}
                          value={currentTime}
                          onChange={(e) => {
                            if (audioRef.current) {
                              audioRef.current.currentTime = parseFloat(e.target.value);
                              setCurrentTime(parseFloat(e.target.value));
                            }
                          }}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-exroast-pink"
                        />
                        <div className="flex justify-between text-xs text-white mt-2">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-6">
                      <div className="space-y-4">
                        <button 
                          className="w-full btn-primary flex items-center justify-center space-x-2"
                          disabled
                        >
                          <FaLock />
                          <span>Export Full Track (Paid)</span>
                        </button>
                        
                        <AuthAwareCTA className="w-full btn-primary"> 
                          Create Your Own Track
                        </AuthAwareCTA>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-6">
                      <h4 className="text-sm font-semibold text-white mb-3">Share This Track</h4>
                      <SocialShareButtons 
                        url={shareUrl}
                        title={song.title}
                        message={`Check out this AI-generated motivation track: ${song.title}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-black text-center">
              <h3 className="text-2xl font-bold text-gradient mb-4">
                  👑 Want AI Coaching Too?
                </h3>
                <p className="text-white mb-6">
                  Get personalized coaching, confidence tips, and actionable advice from our AI coach.
                </p>
              <Link href="/pricing">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary"
                >
                  Explore Premium Features
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
