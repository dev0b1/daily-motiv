"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// This component also attempts to claim pending single-song purchases when
// a user signs in and a `pendingSingleSongId` exists in localStorage.

export default function PendingClaimBanner() {
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    try {
      // Read query params to detect purchase type on success page
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search || '');
      const type = params.get('type');
      const tier = params.get('tier');
      let credits = 0;

      if (type === 'single') credits = 1;
      else if (tier === 'weekly') credits = 3;

      if (credits > 0) {
        // Persist pending credits for same-browser sign-in as a plain number
        try {
          const existing = localStorage.getItem('pendingCredits');
          if (!existing) {
            localStorage.setItem('pendingCredits', String(credits));
          }
        } catch (e) {}
        setPending(credits);
      }
    } catch (e) {
      console.error('PendingClaimBanner error', e);
    }
  }, []);

  useEffect(() => {
    // Attempt to claim a pending single-song purchase when the user signs in.
    try {
      if (typeof window === 'undefined') return;
      const pendingSongId = localStorage.getItem('pendingSingleSongId');
      if (!pendingSongId) return;

      const supabase = createClientComponentClient();
      (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return; // not signed in yet

          // Call claim endpoint to attach the purchase to this user
          const res = await fetch('/api/credits/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songId: pendingSongId })
          });

          const body = await res.json();
          if (body && body.success) {
            // Clear pending markers and refresh UI
            try { localStorage.removeItem('pendingSingleSongId'); } catch (e) {}
            try { localStorage.removeItem('pendingCredits'); } catch (e) {}
            setPending(null);
            // Optionally reload to reflect unlocked song
            window.location.reload();
          }
        } catch (e) {
          console.warn('Auto-claim pending purchase failed', e);
        }
      })();
    } catch (e) {
      console.error('PendingClaimBanner claim effect failed', e);
    }
  }, []);

  if (!pending) return null;

  return (
    <div className="p-4 bg-gradient-to-r from-green-900/60 to-green-700/40 rounded-lg border border-green-600">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white font-bold">You have a pending credit 🎉</div>
          <div className="text-sm text-white/80">Sign in to claim {pending} credit{pending > 1 ? 's' : ''} and use it to generate your personalized song.</div>
        </div>
        <div className="ml-4">
          <Link href={`/auth?redirectTo=/app`} className="btn-primary px-4 py-2">Sign in to claim</Link>
        </div>
      </div>
    </div>
  );
}
