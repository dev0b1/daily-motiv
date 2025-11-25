"use client";

import { motion } from "framer-motion";
import { FaFire, FaCrown } from "react-icons/fa";
import clsx from "clsx";
import CustomSelect from "./CustomSelect";

export type SongStyle = "petty" | "glowup";

interface StyleSelectorProps {
  selected: SongStyle;
  onChange: (style: SongStyle) => void;
}

const styles = [
  { id: "petty" as SongStyle, name: "Petty Roast", description: "Savage, brutal, hilarious roast 🔥" },
  { id: "glowup" as SongStyle, name: "Glow-Up Flex", description: "Upbeat victory anthem 👑" },
];

export function StyleSelector({ selected, onChange }: StyleSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xl font-black text-exroast-gold">Choose Your Vibe</label>
      <CustomSelect
        value={selected}
        onChange={(v) => onChange(v as SongStyle)}
        options={styles.map(s => ({ value: s.id, label: `${s.name} — ${s.description}` }))}
        ariaLabel="Choose your vibe"
      />
    </div>
  );
}
