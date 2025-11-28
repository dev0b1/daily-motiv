"use client";

import { useState, useEffect, useRef } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from "next/navigation";
import { openSingleCheckout, openTierCheckout } from "@/lib/checkout";

export default function SettingsMenu({ user, onClose }: { user?: any; onClose?: () => void }) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      try { localStorage.removeItem('intendedPurchase'); } catch (e) {}
      router.push('/');
    } catch (e) {
      console.error('Sign out failed', e);
    } finally {
      setLoading(false);
      onClose?.();
    }
  };

  const [isMobile, setIsMobile] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    const m = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(m.matches);
    update();
    m.addEventListener('change', update);
    return () => m.removeEventListener('change', update);
  }, []);

  const [roasts, setRoasts] = useState<any[] | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) {
        setCredits(0);
        setRoasts([]);
        return;
      }

      try {
        const res = await fetch('/api/account/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });
        if (!res.ok) throw new Error('no summary');
        const json = await res.json();
        if (!mounted) return;
        const c = Number(json?.subscription?.creditsRemaining ?? 0) || 0;
        setCredits(c);
        setRoasts(Array.isArray(json?.roasts) ? json.roasts : []);
      } catch (e) {
        if (mounted) {
          setCredits(0);
          setRoasts([]);
        }
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    // focus the first button inside the modal
    const el = containerRef.current;
    if (el) {
      const btn = el.querySelector('button:not([disabled])') as HTMLElement | null;
      btn?.focus?.();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
      if (e.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;
        const focusable = Array.from(container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
          .filter((n: any) => !n.hasAttribute('disabled') && (n as HTMLElement).offsetParent !== null) as HTMLElement[];
        if (focusable.length === 0) return;
        const idx = focusable.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey) {
          if (idx === 0) {
            focusable[focusable.length - 1].focus();
            e.preventDefault();
          }
        } else {
          if (idx === focusable.length - 1) {
            focusable[0].focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // lock background scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex sm:items-center items-start justify-center p-4 sm:p-6 md:p-8 overflow-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-menu-title"
      onClick={handleOverlayClick}
    >
      <div
        id="settings-menu"
        ref={containerRef}
        className="w-full max-w-5xl bg-gradient-to-br from-[#0a0a0c] via-[#0f0a12] to-[#0a0a0c] border-2 border-exroast-pink/40 rounded-2xl shadow-[0_0_50px_rgba(255,0,110,0.3)] overflow-auto max-h-[calc(100vh-96px)] sm:max-h-[calc(100vh-128px)] animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-exroast-pink/20 bg-gradient-to-r from-exroast-pink/5 to-transparent">
          <div className="flex items-center gap-4">
            {user?.user_metadata?.avatar_url ? (
              <div className="relative">
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="avatar" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-exroast-pink/50 shadow-lg" 
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-[#0a0a0c]"></div>
              </div>
            ) : (
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-exroast-pink/20 to-purple-500/20 flex items-center justify-center text-3xl border-2 border-exroast-pink/50">
                👤
              </div>
            )}
            <div>
              <div id="settings-menu-title" className="text-white font-black text-xl tracking-tight">{user?.email || 'Account'}</div>
              <div className="text-sm text-white/60 mt-1">
                Credits: <span className="font-bold text-exroast-pink">{credits ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={async () => { onClose?.(); try { await openTierCheckout('premium'); } catch (e) { console.error('Open checkout failed', e); window.location.href = '/pricing'; } }}
              className="hidden sm:inline-flex items-center bg-gradient-to-r from-[#ff006e] via-[#ff4791] to-[#ffd23f] text-black font-extrabold px-6 py-3 rounded-full shadow-lg hover:shadow-[0_0_20px_rgba(255,0,110,0.6)] hover:scale-105 transition-all duration-200"
            >
              <span>Upgrade</span>
              <span className="ml-2">🔥</span>
            </button>
            <button
              type="button"
              onClick={() => onClose?.()}
              aria-label="Close settings"
              className="text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body: two columns on desktop */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            {/* Account panel removed per UX: we don't expose an account nav here */}

            <div className="relative bg-gradient-to-br from-[#1a0f1f] via-[#0f0a15] to-[#0a0a0c] p-6 rounded-xl border border-exroast-pink/30 shadow-lg overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-exroast-pink/10 rounded-full blur-3xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-white/70 font-medium">Credits available</div>
                    <div className="text-4xl font-black mt-2 bg-gradient-to-r from-exroast-pink to-yellow-400 bg-clip-text text-transparent">
                      {credits ?? 0}
                    </div>
                  </div>
                  <div className="text-5xl opacity-20">🎵</div>
                </div>
                <button
                  type="button"
                  onClick={async () => { onClose?.(); try { await openTierCheckout('unlimited'); } catch (e) { console.error('Open checkout failed', e); window.location.href = '/pricing'; } }}
                  className="w-full bg-gradient-to-r from-exroast-pink to-purple-600 px-5 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-[0_0_20px_rgba(255,0,110,0.4)] hover:scale-[1.02] transition-all duration-200"
                >
                  Go Unlimited 🚀
                </button>
                <div className="text-xs text-white/50 mt-3 text-center">Unlimited roasts + audio nudges</div>
              </div>
            </div>

            <div className="mt-2">
              <div className="text-sm text-white/60 font-semibold mb-3 px-1">Quick actions</div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={async () => { onClose?.(); try { await openSingleCheckout(); } catch (e) { console.error('Open single checkout failed', e); window.location.href = '/pricing'; } }}
                  className="group w-full text-left px-5 py-4 rounded-xl bg-gradient-to-r from-white/5 to-white/[0.02] hover:from-exroast-pink/10 hover:to-purple-500/10 border border-white/10 hover:border-exroast-pink/30 transition-all duration-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💎</span>
                    <span className="font-semibold text-white">Upgrade - Buy full roast</span>
                  </div>
                  <svg className="w-5 h-5 text-white/40 group-hover:text-exroast-pink transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    onClose?.();
                    try {
                      // prefer an explicit credits price id env var, fall back to premium price
                      const creditsPrice = (process.env.NEXT_PUBLIC_PADDLE_PRICE_CREDITS || process.env.NEXT_PUBLIC_PADDLE_PRICE_PREMIUM) as string | undefined;
                      if (creditsPrice) {
                        await openTierCheckout('credits', creditsPrice);
                      } else {
                        // fallback to single checkout if no credits price configured
                        await openSingleCheckout();
                      }
                    } catch (e) {
                      console.error('Open buy credits failed', e);
                      window.location.href = '/pricing';
                    }
                  }}
                  className="group w-full text-left px-5 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">➕</span>
                    <span className="font-semibold text-white">Buy Credits</span>
                  </div>
                  <svg className="w-5 h-5 text-white/40 group-hover:text-exroast-pink transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Right column: My Roasts */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="text-sm text-white/60 font-semibold flex items-center gap-2">
                <span className="text-xl">📚</span>
                <span>My History</span>
              </div>
              <div className="text-xs text-white/50 bg-white/5 px-3 py-1 rounded-full">Recent</div>
            </div>

            <div className="flex-1 bg-gradient-to-br from-white/[0.03] to-white/[0.01] rounded-xl p-3 border border-white/10 max-h-[400px] overflow-auto custom-scrollbar">
              {roasts === null ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-white/60 flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-exroast-pink border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading…</span>
                  </div>
                </div>
              ) : roasts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <div className="text-4xl mb-2 opacity-30">🎵</div>
                  <div className="text-white/60">No vents yet</div>
                  <div className="text-xs text-white/40 mt-1">Create your first vent to see it here</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {roasts.slice(0, 8).map((r: any) => (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => { onClose?.(); router.push('/app?tab=history'); }}
                      className="group w-full text-left px-4 py-3 rounded-lg bg-white/[0.02] hover:bg-gradient-to-r hover:from-exroast-pink/10 hover:to-purple-500/10 border border-white/5 hover:border-exroast-pink/30 transition-all duration-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-exroast-pink/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">🎵</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate group-hover:text-exroast-pink transition-colors">
                            {r.title || 'Untitled Vent'}
                          </div>
                          <div className="text-xs text-white/50">{new Date(r.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-white/30 group-hover:text-exroast-pink transition-colors flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold shadow-lg hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing out…</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 0, 110, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 0, 110, 0.5);
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-bottom-4 {
          from { transform: translateY(1rem); }
          to { transform: translateY(0); }
        }
        .animate-in {
          animation: fade-in 0.3s ease-out, slide-in-from-bottom-4 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}