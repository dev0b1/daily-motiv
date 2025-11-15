"use client";

import Link from "next/link";
import { FaTiktok, FaInstagram, FaTwitter, FaHeart } from "react-icons/fa";

export function Footer() {
  return (
    <footer className="bg-gradient-to-br from-gray-900 to-heartbreak-900 text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <FaHeart className="text-heartbreak-400 text-xl" />
              <span className="text-lg font-bold">HeartHeal</span>
            </div>
            <p className="text-gray-400 text-sm">
              Transform your heartbreak into healing songs. Express what you feel with AI-powered music.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/#pricing" className="hover:text-heartbreak-300 transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-heartbreak-300 transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/story" className="hover:text-heartbreak-300 transition-colors">
                  Create Song
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">About</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/#about-ai" className="hover:text-heartbreak-300 transition-colors">
                  About AI
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-heartbreak-300 transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-heartbreak-300 transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Follow Us</h3>
            <div className="flex space-x-4">
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-heartbreak-300 transition-colors"
              >
                <FaTiktok className="text-2xl" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-heartbreak-300 transition-colors"
              >
                <FaInstagram className="text-2xl" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-heartbreak-300 transition-colors"
              >
                <FaTwitter className="text-2xl" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2025 HeartHeal. All rights reserved. Made with 💔 and AI.</p>
        </div>
      </div>
    </footer>
  );
}
