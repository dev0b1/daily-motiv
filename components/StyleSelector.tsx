"use client";

import { motion } from "framer-motion";
import { FaFire, FaCrown } from "react-icons/fa";
import clsx from "clsx";

export type SongStyle = "petty" | "glowup";

interface StyleSelectorProps {
  selected: SongStyle;
  onChange: (style: SongStyle) => void;
}

const styles = [
  {
    id: "petty" as SongStyle,
    name: "Petty Roast",
    icon: FaFire,
    description: "Savage, brutal, hilarious roast 🔥",
    color: "from-exroast-pink to-red-600",
    bgColor: "bg-exroast-pink/10",
    borderColor: "border-exroast-pink",
    example: "They thought they were the catch? LOL",
  },
  {
    id: "glowup" as SongStyle,
    name: "Glow-Up Flex",
    icon: FaCrown,
    description: "Upbeat victory anthem 👑",
    color: "from-exroast-gold to-yellow-400",
    bgColor: "bg-exroast-gold/10",
    borderColor: "border-exroast-gold",
    example: "I'm thriving, they're crying",
  },
];

export function StyleSelector({ selected, onChange }: StyleSelectorProps) {
  return (
    <div className="space-y-4">
      <label className="block text-xl font-black text-exroast-gold">
        Choose Your Vibe 🎵
      </label>
  <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4">
        {styles.map((style) => {
          const Icon = style.icon;
          const isSelected = selected === style.id;
          
          return (
            <motion.button
              key={style.id}
              onClick={() => onChange(style.id)}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className={clsx(
                  // make each card wider on mobile (height ~60% of width) so descriptions fit; reduce padding so card stretches
                  "w-full aspect-[5/3] md:aspect-auto p-0 md:p-8 rounded-2xl border-4 transition-all duration-300",
                isSelected
                  ? `${style.bgColor} ${style.borderColor} shadow-2xl shadow-${style.id === 'petty' ? 'exroast-pink' : 'exroast-gold'}/50`
                  : "bg-exroast-black/50 border-gray-700 hover:border-gray-600 shadow-xl",
              )}
            >
              <div className="flex flex-col items-start justify-center h-full space-y-2 text-left px-3">
                <div
                  className={clsx(
                      "p-2 md:p-6 rounded-full bg-gradient-to-br",
                    style.color
                  )}
                >
                    <Icon className="text-2xl md:text-5xl text-white" />
                </div>
                <div className="w-full md:mt-2">
                    <h3 className="font-black text-sm md:text-2xl text-white mb-1">
                    {style.name}
                  </h3>
                    <p className="block text-xs md:text-base text-gray-300 mb-1 truncate">{style.description}</p>
                    <p className="block text-[10px] md:text-sm italic text-gray-400 truncate">"{style.example}"</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
