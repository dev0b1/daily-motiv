"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { FaPlay, FaShare, FaLock, FaCrown } from 'react-icons/fa';

interface Roast {
  id: string;
  title: string;
  mode: string;
  audioUrl: string;
  createdAt: string;
  isTemplate: boolean;
}

export default function HistoryPage() {
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      if (typeof window === 'undefined') return;
      
      let recentRoasts: any[] = [];
      try {
        const raw = localStorage.getItem('recentRoasts');
        if (raw) recentRoasts = JSON.parse(raw);
        if (!Array.isArray(recentRoasts)) recentRoasts = [];
      } catch (err) {
        console.warn('Invalid recentRoasts in localStorage, resetting it.', err, localStorage.getItem('recentRoasts'));
        recentRoasts = [];
      }
      
      if (recentRoasts.length === 0) {
        setLoading(false);
        return;
      }

      const roastPromises = recentRoasts.map(async (item: any) => {
        try {
          const response = await fetch(`/api/song/${item.id}`);
          const data = await response.json();
          return data.success ? data.song : null;
        } catch {
          return null;
        }
      });

      const loadedRoasts = (await Promise.all(roastPromises)).filter(Boolean);
      setRoasts(loadedRoasts);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative">
        <AnimatedBackground />
        <Header />
        <main className="pt-32 pb-20 relative z-10">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-white text-xl">Loading your roasts... 🔥</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <AnimatedBackground />
      <Header />
      
      <main className="pt-32 pb-20 relative z-10">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-5xl font-black mb-4">
              <span className="bg-gradient-to-r from-exroast-pink to-exroast-gold bg-clip-text text-transparent">
                Your Roast History 🔥
              </span>
            </h1>
            <p className="text-gray-400 text-lg">
              {isPro ? 'All your personalized roasts in one place' : 'Your last 3 free template roasts (Upgrade to Pro for unlimited history)'}
            </p>
          </motion.div>

          {!isPro && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 bg-gradient-to-r from-exroast-pink/20 to-exroast-gold/20 border-2 border-exroast-gold rounded-xl p-6"
            >
              <div className="flex items-start gap-4">
                <FaCrown className="text-exroast-gold text-3xl flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-xl font-black text-exroast-gold mb-2">
                    Upgrade to Pro for Unlimited History
                  </h3>
                  <p className="text-gray-300 mb-4">
                    Save all your roasts forever, plus get personalized AI songs from your stories and screenshots!
                  </p>
                  <Link href="/pricing">
                    <button className="bg-gradient-to-r from-exroast-pink to-exroast-gold text-white font-black px-6 py-3 rounded-full hover:scale-105 transition-transform">
                      View Pro Features
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {roasts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-4">😢</div>
              <h2 className="text-2xl font-bold text-white mb-4">
                No roasts yet!
              </h2>
              <p className="text-gray-400 mb-8">
                Create your first savage breakup song to see it here
              </p>
              <Link href="/story">
                <button className="bg-gradient-to-r from-exroast-pink to-exroast-gold text-white font-black px-8 py-4 rounded-full text-lg hover:scale-105 transition-transform">
                  Create Your First Roast 🔥
                </button>
              </Link>
            </motion.div>
          ) : (
            <div className="grid gap-6">
              {roasts.map((roast, index) => (
                <motion.div
                  key={roast.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-900/50 backdrop-blur-sm border border-exroast-pink/30 rounded-xl p-6 hover:border-exroast-pink/60 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-black text-white">
                          {roast.title}
                        </h3>
                        {roast.isTemplate && (
                          <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                            Template
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mb-4">
                        {roast.mode.charAt(0).toUpperCase() + roast.mode.slice(1)} • {new Date(roast.createdAt).toLocaleDateString()}
                      </p>
                      
                      <div className="flex gap-3">
                        <Link href={`/preview?songId=${roast.id}`}>
                          <button className="flex items-center gap-2 bg-exroast-pink hover:bg-exroast-pink/80 text-white font-bold px-4 py-2 rounded-lg transition-colors">
                            <FaPlay /> Play
                          </button>
                        </Link>
                        <Link href={`/share/${roast.id}`}>
                          <button className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold px-4 py-2 rounded-lg transition-colors">
                            <FaShare /> Share
                          </button>
                        </Link>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      {roast.isTemplate ? (
                        <div className="text-4xl">🎵</div>
                      ) : (
                        <div className="text-4xl">⭐</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
