"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthCompleteClient() {
  const router = useRouter();
  const search = useSearchParams();
  const supabase = createClientComponentClient();

  const returnToRaw = search.get('returnTo') || '/';

  useEffect(() => {
    (async () => {
      try {
        // If the provider sent an auth code to this URL (e.g. ?code=...), forward
        // the full query string to the canonical server callback so the server can
        // exchange the code for a session and set cookies. This avoids a race where
        // the client waits for a session that was never established on this URL.
        const code = search.get('code');
        if (code && typeof window !== 'undefined') {
          // Preserve the entire query string when forwarding.
          const qs = window.location.search || '';
          window.location.replace(`${window.location.origin}/auth/callback${qs}`);
          return;
        }

        const start = Date.now();
        let user = null;
        while (Date.now() - start < 3000) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && session.user) {
            user = session.user;
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }

        if (!user) {
          // If we couldn't observe a session after the code exchange, send user to /auth
          router.push(`/auth?redirectTo=${encodeURIComponent(returnToRaw)}`);
          return;
        }

        // Check if we persisted an intended purchase (resume flow)
        let resumePath: string | null = null;
        try {
          const raw = localStorage.getItem('intendedPurchase');
          if (raw) {
            const payload = JSON.parse(raw);
            if (payload && payload.type) {
              if (payload.type === 'single') {
                resumePath = payload.songId ? `/checkout?type=single&songId=${encodeURIComponent(payload.songId)}` : `/checkout?type=single`;
              } else if (payload.type === 'tier') {
                resumePath = payload.tierId ? `/checkout?tier=${encodeURIComponent(payload.tierId)}` : `/pricing`;
              }
            }
          }
        } catch (e) {
          // ignore parse errors
        }

        // Attempt to claim any pending credits stored in localStorage by the
        // same-browser checkout success flow (pendingCredits is set on /success).
        try {
          const pendingRaw = localStorage.getItem('pendingCredits');
          if (pendingRaw) {
            const credits = Number(pendingRaw);
            if (credits && credits > 0) {
              const res = await fetch('/api/local-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credits })
              });
              if (res.ok) {
                // persist a short-lived local marker so the header can show a toast
                try {
                  localStorage.setItem('claimedCredits', String(credits));
                  // also set justSignedIn for legacy behavior
                  localStorage.setItem('justSignedIn', 'true');
                } catch (e) {}
              }
              localStorage.removeItem('pendingCredits');
            }
          }
        } catch (e) {
          console.error('Local claim failed', e);
        }

        const finalPath = resumePath || decodeURIComponent(returnToRaw || '/');
        if (!finalPath.startsWith('/')) {
          router.push('/');
          return;
        }

        try {
          localStorage.setItem('justSignedIn', 'true');
          // Clear intended purchase so it doesn't trigger repeatedly
          localStorage.removeItem('intendedPurchase');
        } catch (e) {}
        router.push(finalPath);
      } catch (err) {
        console.error('Auth finalize error', err);
        router.push('/');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnToRaw]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="text-exroast-gold text-4xl mb-4">Finalizing sign-in…</div>
        <div className="text-gray-400">You will be redirected shortly.</div>
      </div>
    </div>
  );
}
