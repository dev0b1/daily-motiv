"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StyleSelector, SongStyle } from "@/components/StyleSelector";
import FileUpload from "@/components/FileUpload";
import LoadingProgress, { LoadingStep } from "@/components/LoadingProgress";
import { FiEdit, FiImage } from "react-icons/fi";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { SparkStorm } from "@/components/SparkStorm";
import { ConfettiPop } from "@/components/ConfettiPop";
import { Tooltip } from "@/components/Tooltip";

type InputMode = 'text' | 'screenshot';

export default function StoryPage() {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [story, setStory] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [style, setStyle] = useState<SongStyle>("petty");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('ocr');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleGenerate = async () => {
    if (inputMode === 'text' && story.trim().length < 10) {
      alert("Spill more tea! We need at least 10 characters to roast properly 🔥");
      return;
    }

    if (inputMode === 'screenshot' && !screenshot) {
      alert("Upload that screenshot! We need the receipts 🔥");
      return;
    }

    setIsGenerating(true);
    setLoadingStep('ocr');
    setLoadingProgress(0);

    try {
      let extractedText = story;

      if (inputMode === 'screenshot' && screenshot) {
        setLoadingStep('ocr');
        
        const formData = new FormData();
        formData.append('image', screenshot);

        const ocrResponse = await fetch('/api/ocr', {
          method: 'POST',
          body: formData,
        });

        const ocrData = await ocrResponse.json();

        if (!ocrData.success) {
          throw new Error(ocrData.error || 'Failed to extract text from screenshot');
        }

        extractedText = ocrData.cleanedText;
      }

      setLoadingStep('lyrics');
      setLoadingProgress(30);

      const response = await fetch("/api/generate-song", {
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
        
        setTimeout(() => {
          router.push(`/preview?songId=${data.songId}`);
        }, 1500);
      } else {
        throw new Error(data.error || "Failed to generate song");
      }
    } catch (error) {
      console.error("Error generating song:", error);
      alert(`Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <AnimatedBackground />
        <div className="relative z-10">
          <LoadingProgress currentStep={loadingStep} progress={loadingProgress} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <AnimatedBackground />
      <SparkStorm />
      <ConfettiPop show={showConfetti} onComplete={() => setShowConfetti(false)} />
      <Header />
      
      <main className="pt-32 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="text-center space-y-4">
              <h1 className="text-5xl md:text-6xl font-black text-gradient">
                Spill the Tea 🔥
              </h1>
              <p className="text-2xl text-white font-bold">
                What did they do? We need ALL the details 🔥
              </p>
            </div>

            <div className="card space-y-6">
              {/* Input Mode Selector */}
              <div className="flex gap-4">
                <button
                  onClick={() => setInputMode('text')}
                  className={`flex-1 py-4 px-6 rounded-xl font-black text-lg transition-all duration-300 ${
                    inputMode === 'text'
                      ? 'bg-[#ff006e] text-white border-2 border-[#ffd23f] shadow-lg shadow-[#ffd23f]/50'
                      : 'bg-exroast-black/50 text-white border-2 border-white/10 hover:border-exroast-gold'
                  }`}
                >
                  <FiEdit className="inline mr-2" />
                  Type It Out
                </button>
                <button
                  onClick={() => setInputMode('screenshot')}
                  className={`flex-1 py-4 px-6 rounded-xl font-black text-lg transition-all duration-300 ${
                    inputMode === 'screenshot'
                      ? 'bg-[#ff006e] text-white border-2 border-[#ffd23f] shadow-lg shadow-[#ffd23f]/50'
                      : 'bg-exroast-black/50 text-white border-2 border-white/10 hover:border-exroast-gold'
                  }`}
                >
                  <FiImage className="inline mr-2" />
                  Upload Screenshot
                </button>
              </div>

              {/* Text Input */}
              {inputMode === 'text' && (
                <div className="space-y-2">
                  <label className="block text-xl font-black text-white">
                    Spill the tea — what did they do? 🔥
                  </label>
                  <Tooltip content="Be specific for savage lyrics (e.g., 'Ghosted after tacos')">
                    <div className="relative" style={{ padding: '0 20px' }}>
                      <textarea
                        value={story}
                        onChange={(e) => {
                          if (e.target.value.length <= 500) {
                            setStory(e.target.value);
                          }
                        }}
                        maxLength={500}
                        placeholder="They ghosted me after 2 years... They cheated with my best friend... They said I was 'too much'... Give us EVERYTHING 🗡️"
                        className="input-field resize-none"
                        style={{ 
                          width: '100%',
                          minHeight: '120px',
                          fontSize: '16px',
                          opacity: 1.0
                        }}
                      />
                      <div className="absolute bottom-4 right-6 text-base font-bold" style={{ color: '#ffd23f', opacity: 1.0 }}>
                        {story.length}/500
                      </div>
                    </div>
                  </Tooltip>
                  <p className="text-sm text-white italic">
                    💡 The more specific, the more savage the roast
                  </p>
                </div>
              )}

              {/* Screenshot Upload */}
              {inputMode === 'screenshot' && (
                <div className="space-y-2">
                  <label className="block text-xl font-black text-white">
                    Drop those receipts 📸
                  </label>
                  <FileUpload
                    onFileSelect={(file) => setScreenshot(file)}
                    onClear={() => setScreenshot(null)}
                  />
                  <p className="text-sm text-white italic">
                    💡 Upload a chat screenshot for max petty energy
                  </p>
                </div>
              )}

              {/* Style Selector */}
              <div className="pt-4">
                <Tooltip content="Petty = Brutal diss; Glow-Up = Victory banger">
                  <div>
                    <StyleSelector
                      selected={style}
                      onChange={setStyle}
                    />
                  </div>
                </Tooltip>
              </div>

              {/* Generate Button */}
              <Tooltip content="15s free preview—unlock full for $4.99">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerate}
                  disabled={inputMode === 'text' && story.trim().length < 10}
                  className={`w-full py-6 rounded-2xl font-black text-2xl transition-all duration-300 ${
                    inputMode === 'text' && story.trim().length < 10
                      ? 'bg-gray-700 text-white cursor-not-allowed opacity-50'
                      : 'btn-pulse'
                  }`}
                  style={
                    inputMode === 'text' && story.trim().length < 10
                      ? {}
                      : {
                          backgroundColor: '#ff006e',
                          color: '#ffffff',
                          border: '2px solid #ffd23f',
                          boxShadow: '0 0 20px #ff006e',
                          opacity: 1.0
                        }
                  }
                >
                  <span style={{ opacity: 1.0 }}>Generate My Roast 🔥💅</span>
                </motion.button>
              </Tooltip>

              <p className="text-center text-sm text-gray-400">
                Free 15-second preview • Full roast $4.99 • Takes 30 seconds
              </p>
            </div>
          </motion.div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
