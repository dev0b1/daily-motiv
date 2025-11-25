"use client";

import { useEffect, useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  ariaLabel?: string;
}

export default function CustomSelect({ value, onChange, options, ariaLabel }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const selected = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label={ariaLabel || 'Select option'}
        onClick={() => setOpen(s => !s)}
        type="button"
        className="w-full flex items-center justify-between px-3 py-3 rounded-md bg-black text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="truncate">{selected?.label}</span>
        <FaChevronDown className="ml-3 text-sm" />
      </button>

      {open && (
        <ul className="absolute z-40 mt-2 w-full bg-black border border-white/10 rounded-md shadow-lg max-h-56 overflow-auto">
          {options.map((opt) => (
            <li
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`px-3 py-2 cursor-pointer text-white hover:bg-blue-600 ${opt.value === value ? 'bg-white/5' : ''}`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
