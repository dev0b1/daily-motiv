"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FaFire, FaDumbbell } from "react-icons/fa";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnimatedBackground } from "@/components/AnimatedBackground";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black relative">
      <AnimatedBackground />
      <div className="relative z-10">
        <Header />
        
        <main className="pt-24 pb-20 px-4">
          {/* Hero Section */}
          <section className="max-w-6xl mx-auto text-center space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-4"
            >
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-tight text-white">
                Turn your breakup into<br />
                <span className="text-gradient">savage closure</span>
              </h1>
              <p className="text-3xl md:text-4xl font-black text-exroast-gold">
                …and daily glow-ups 🔥
              </p>
            </motion.div>

            {/* Two Big Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-16 max-w-5xl mx-auto">
              {/* Roast Your Ex Card */}
              <Link href="/template">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  whileHover={{ scale: 1.05, y: -10 }}
                  className="card border-4 border-exroast-pink hover:border-exroast-gold cursor-pointer h-full min-h-[400px] flex flex-col justify-between bg-gradient-to-br from-exroast-pink/10 to-black hover:shadow-[0_0_40px_rgba(255,105,180,0.4)] transition-all duration-300"
                >
                  <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-8">
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="text-8xl emoji-enhanced"
                    >
                      🔥
                    </motion.div>
                    <h2 className="text-4xl md:text-5xl font-black text-gradient">
                      ROAST YOUR EX
                    </h2>
                    <p className="text-xl md:text-2xl text-white font-bold">
                      30-second AI diss track<br />that ends them
                    </p>
                  </div>
                  <div className="p-6">
                    <div className="btn-primary w-full text-xl py-4 flex items-center justify-center gap-3">
                      <span>Create My Roast</span>
                      <FaFire />
                    </div>
                  </div>
                </motion.div>
              </Link>

              {/* Daily Glow-Up Card */}
              <Link href="/daily">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  whileHover={{ scale: 1.05, y: -10 }}
                  className="card border-4 border-purple-500 hover:border-exroast-gold cursor-pointer h-full min-h-[400px] flex flex-col justify-between bg-gradient-to-br from-purple-900/20 via-exroast-gold/10 to-black hover:shadow-[0_0_40px_rgba(138,43,226,0.4)] transition-all duration-300"
                >
                  <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-8">
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: -10 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="text-8xl emoji-enhanced"
                    >
                      💪
                    </motion.div>
                    <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-400 to-exroast-gold bg-clip-text text-transparent">
                      DAILY GLOW-UP
                    </h2>
                    <p className="text-xl md:text-2xl text-white font-bold">
                      Vent & get motivation<br />every single day
                    </p>
                  </div>
                  <div className="p-6">
                    <div className="btn-secondary w-full text-xl py-4 flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700">
                      <span>Check In Today</span>
                      <FaDumbbell />
                    </div>
                  </div>
                </motion.div>
              </Link>
            </div>

            {/* Footer CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="pt-12 text-gray-400 text-lg"
            >
              <p className="font-bold">
                New here? Pick one above • Already have a streak?{" "}
                <Link href="/auth" className="text-exroast-gold hover:text-exroast-pink underline">
                  Sign in
                </Link>
              </p>
            </motion.div>
          </section>
        </main>
      </div>
      <Footer />
    </div>
  );
}
