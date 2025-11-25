"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        // Smoothly scroll to the top on mount or any navigation
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        // Also reset any focused element's scroll position (best-effort)
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    } catch (e) {
      // ignore in non-browser environments
    }
  }, [pathname]);

  return null;
}
