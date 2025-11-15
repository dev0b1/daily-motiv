'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCheck } from 'react-icons/fa';
import Link from 'next/link';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaTimes className="text-xl" />
            </button>

            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 mx-auto bg-gradient-to-br from-rose-500 to-purple-500 rounded-full flex items-center justify-center"
              >
                <span className="text-4xl">🎵</span>
              </motion.div>

              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Love your song?
                </h2>
                <p className="text-gray-600">
                  Get unlimited songs for $9/month
                </p>
              </div>

              <div className="bg-gradient-to-br from-rose-50 to-purple-50 rounded-2xl p-6 space-y-3 text-left">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center mt-0.5">
                    <FaCheck className="text-white text-xs" />
                  </div>
                  <p className="text-gray-700">Unlimited songs, any time</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center mt-0.5">
                    <FaCheck className="text-white text-xs" />
                  </div>
                  <p className="text-gray-700">No watermark on downloads</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center mt-0.5">
                    <FaCheck className="text-white text-xs" />
                  </div>
                  <p className="text-gray-700">Priority song generation</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center mt-0.5">
                    <FaCheck className="text-white text-xs" />
                  </div>
                  <p className="text-gray-700">Cancel anytime, no commitment</p>
                </div>
              </div>

              <div className="space-y-3">
                <Link href="/pricing">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-600 hover:to-purple-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Subscribe Now
                  </motion.button>
                </Link>
                <button
                  onClick={onClose}
                  className="w-full text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Maybe Later
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Join 10,000+ users healing through music
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
