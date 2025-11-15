'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AnalysisScreenProps {
  onComplete: () => void;
  uploadedImage?: boolean;
}

export function AnalysisScreen({ onComplete, uploadedImage = false }: AnalysisScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);

  // Generate random analysis data for MVP - only once on mount
  const [analysisData] = useState(() => {
    const redFlagLevels = ['Low', 'Medium', 'High'];
    const recommendedVibes = ['Sad', 'Savage', 'Healing', 'Vibe', 'Meme'];
    
    return {
      redFlagLevel: redFlagLevels[Math.floor(Math.random() * redFlagLevels.length)],
      heartbreakIntensity: Math.floor(Math.random() * 4) + 7, // 7-10
      recommendedVibe: recommendedVibes[Math.floor(Math.random() * recommendedVibes.length)]
    };
  });

  const { redFlagLevel, heartbreakIntensity, recommendedVibe } = analysisData;

  const getRedFlagEmoji = (level: string) => {
    switch (level) {
      case 'High': return '🚩🚩🚩';
      case 'Medium': return '🚩🚩';
      default: return '🚩';
    }
  };

  useEffect(() => {
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    // Phase transitions
    const phaseTimeout1 = setTimeout(() => setCurrentPhase(1), 1000);
    const phaseTimeout2 = setTimeout(() => setCurrentPhase(2), 2000);
    const phaseTimeout3 = setTimeout(() => setCurrentPhase(3), 3000);
    const completeTimeout = setTimeout(() => {
      onComplete();
    }, 5000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(phaseTimeout1);
      clearTimeout(phaseTimeout2);
      clearTimeout(phaseTimeout3);
      clearTimeout(completeTimeout);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 md:p-12 max-w-lg w-full shadow-2xl"
      >
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 mx-auto mb-4"
            >
              <div className="w-full h-full rounded-full bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center">
                <span className="text-3xl">💔</span>
              </div>
            </motion.div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {uploadedImage ? 'Analyzing your conversation...' : 'Creating your song...'}
            </h2>
            <p className="text-gray-600">
              {uploadedImage ? 'Reading between the lines' : 'Turning your feelings into music'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-rose-500 to-purple-500"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Analysis Results (only show for uploaded images) */}
          {uploadedImage && (
            <div className="space-y-4">
              <AnimatePresence>
                {currentPhase >= 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-4 border border-red-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">{getRedFlagEmoji(redFlagLevel)} Red flag level:</span>
                      <span className={`font-bold ${
                        redFlagLevel === 'High' ? 'text-red-600' :
                        redFlagLevel === 'Medium' ? 'text-orange-600' :
                        'text-yellow-600'
                      }`}>
                        {redFlagLevel}
                      </span>
                    </div>
                  </motion.div>
                )}

                {currentPhase >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">💔 Heartbreak intensity:</span>
                      <span className="font-bold text-purple-600">{heartbreakIntensity}/10</span>
                    </div>
                  </motion.div>
                )}

                {currentPhase >= 3 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">🎵 Recommended vibe:</span>
                      <span className="font-bold text-blue-600">{recommendedVibe}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Loading message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.5 }}
            className="text-center"
          >
            <p className="text-gray-600 font-medium">
              Generating your personalized breakup anthem...
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
