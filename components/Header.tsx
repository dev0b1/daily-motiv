"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FaHeart } from "react-icons/fa";

export function Header() {
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-heartbreak-100"
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="text-heartbreak-500"
            >
              <FaHeart className="text-2xl animate-heartbeat" />
            </motion.div>
            <span className="text-xl font-bold text-gradient">
              HeartHeal
            </span>
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link
              href="/pricing"
              className="text-gray-600 hover:text-heartbreak-500 transition-colors duration-200 font-medium"
            >
              Pricing
            </Link>
            <Link
              href="/#faq"
              className="text-gray-600 hover:text-heartbreak-500 transition-colors duration-200 font-medium"
            >
              FAQ
            </Link>
            <Link href="/story">
              <button className="bg-heartbreak-500 hover:bg-heartbreak-600 text-white px-6 py-2 rounded-full font-medium transition-colors duration-200">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </nav>
    </motion.header>
  );
}
