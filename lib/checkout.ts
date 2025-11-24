"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import initializePaddle from './paddle';

interface SingleCheckoutOpts {
  songId?: string | null;
}

interface IntendedPurchase {
  type: 'single' | 'tier';
  songId?: string | null;
  tierId?: string;
  priceId?: string | null;
  ts: number;
}

// Helper to safely access localStorage
const safeLocalStorage = {
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`Failed to set localStorage key: ${key}`, e);
    }
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Failed to remove localStorage key: ${key}`, e);
    }
  }
};

// Helper to resolve user session with fallback
async function resolveUser() {
  const supabase = createClientComponentClient();
  
  // First try the client-side SDK (this will be populated when the client
  // has a local session / tokens in browser storage).
  try {
    const { data } = await supabase.auth.getSession();
    const sessionData = (data as any)?.session;
    const userFromSession = sessionData?.user;
    if (userFromSession) return userFromSession;
  } catch (e) {
    console.debug('[resolveUser] supabase.auth.getSession() failed', e);
  }

  // If the client SDK doesn't have a user (common when tokens are stored as
  // httpOnly cookies by server-side exchanges), fall back to asking the server
  // for the current session. This keeps behaviour consistent with middleware
  // which uses server-side cookie-based auth.
  try {
    const res = await fetch('/api/session');
    if (res.ok) {
      const body = await res.json();
      if (body?.user) return body.user;
    }
  } catch (e) {
    console.debug('[resolveUser] /api/session fetch failed', e);
  }

  // As a last-ditch attempt, ask the client SDK for the user object.
  try {
    const { data: { user: clientUser } } = await supabase.auth.getUser();
    return clientUser || null;
  } catch (e) {
    console.warn('Failed to get user via client SDK', e);
    return null;
  }
}

// Initialize Paddle once and cache the instance
let paddleInstance: any = null;
let paddleInitPromise: Promise<any> | null = null;

async function ensurePaddleInitialized() {
  // Return cached instance if available
  if (paddleInstance) {
    return paddleInstance;
  }

  // If initialization is already in progress, wait for it
  if (paddleInitPromise) {
    return paddleInitPromise;
  }

  // Start new initialization
  paddleInitPromise = (async () => {
    try {
      const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
      const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT;

      if (!clientToken) {
        throw new Error('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN not configured');
      }

      console.log('[Paddle] Initializing with environment:', environment);

      const instance = await initializePaddle({
        environment: environment === 'production' ? 'production' : 'sandbox',
        token: clientToken,
        eventCallback: (ev) => {
          console.log('[Paddle Event]', ev?.name);
          if (ev?.name === 'checkout.closed' || ev?.name === 'checkout.completed') {
            safeLocalStorage.removeItem('inCheckout');
          }
        }
      });

      paddleInstance = instance;
      return instance;
    } catch (e) {
      console.error('[Paddle] Initialization failed:', e);
      paddleInitPromise = null; // Reset so retry is possible
      throw e;
    }
  })();

  return paddleInitPromise;
}

export async function openSingleCheckout(opts?: SingleCheckoutOpts) {
  console.log('[openSingleCheckout] Starting with opts:', opts);
  
  const user = await resolveUser();
  console.log('[openSingleCheckout] User resolved:', user ? `${user.email} (${user.id})` : 'null');

  if (!user) {
    // Allow anonymous users to open the single-song checkout (guest flow).
    // We persist a pendingSingleSongId so the client can poll for fulfillment
    // and store the full audio locally after webhook unlocks the song.
    console.log('[openSingleCheckout] No authenticated user — opening guest checkout');
    if (typeof window !== 'undefined' && opts?.songId) {
      try { safeLocalStorage.setItem('pendingSingleSongId', opts.songId); } catch (e) { console.warn('Failed to write pendingSingleSongId', e); }
    }
    // continue without returning — we'll open Paddle below without a user
  }

  // Initialize Paddle
  let paddle: any;
  try {
    paddle = await ensurePaddleInitialized();
  } catch (e) {
    console.error('[openSingleCheckout] Failed to initialize Paddle:', e);
    alert('Payment system failed to load. Please refresh and try again.');
    return;
  }

  const singlePriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_SINGLE;
  console.log('[openSingleCheckout] singlePriceId:', singlePriceId);

  if (!singlePriceId) {
    console.error('Single price ID not configured');
    alert('Payment system not configured. Please contact support.');
    return;
  }

  const payload: any = {
    items: [{ priceId: singlePriceId, quantity: 1 }],
    settings: {
      successUrl: `${window.location.origin}/success?type=single${opts?.songId ? `&songId=${opts.songId}` : ''}`,
      theme: 'light',
      allowLogout: false
    },
    customData: {
      // If user exists, include userId so webhook can attach credits/subscription.
      ...(user ? { userId: user.id } : {}),
      ...(opts?.songId && { songId: opts.songId })
    },
    // Include customer email when available to help Paddle identify buyer; guest checkouts omit this.
    ...(user ? { customer: { email: user.email } } : {})
  };

  console.log('[openSingleCheckout] Opening checkout with payload:', {
    successUrl: payload.settings.successUrl,
    customData: payload.customData
  });

  // Mark checkout as in progress
  safeLocalStorage.setItem('inCheckout', 'true');

  try {
    paddle.Checkout.open(payload);
    console.log('[openSingleCheckout] Checkout opened successfully');
  } catch (error) {
    console.error('[openSingleCheckout] Error opening checkout:', error);
    safeLocalStorage.removeItem('inCheckout');
    alert('Failed to open payment system. Please try again.');
  }
}

export async function openTierCheckout(tierId: string, priceId?: string) {
  console.log('[openTierCheckout] Starting with tierId:', tierId, 'priceId:', priceId);
  
  const user = await resolveUser();
  console.log('[openTierCheckout] User resolved:', user ? `${user.email} (${user.id})` : 'null');

  if (!user) {
    console.log('[openTierCheckout] User is null, redirecting to /pricing');
    if (typeof window !== 'undefined') {
      const payload: IntendedPurchase = {
        type: 'tier',
        tierId,
        priceId: priceId || null,
        ts: Date.now()
      };
      safeLocalStorage.setItem('intendedPurchase', JSON.stringify(payload));
      window.location.href = '/pricing';
    }
    return;
  }

  // Initialize Paddle
  let paddle: any;
  try {
    paddle = await ensurePaddleInitialized();
  } catch (e) {
    console.error('[openTierCheckout] Failed to initialize Paddle:', e);
    alert('Payment system failed to load. Please refresh and try again.');
    return;
  }

  const priceToUse = priceId || process.env.NEXT_PUBLIC_PADDLE_PRICE_PREMIUM;
  console.log('[openTierCheckout] priceToUse:', priceToUse);

  if (!priceToUse) {
    console.error('Tier priceId not configured');
    alert('Payment system not configured. Please contact support.');
    return;
  }

  const payload: any = {
    items: [{ priceId: priceToUse, quantity: 1 }],
    settings: {
      successUrl: `${window.location.origin}/success?tier=${tierId}`,
      theme: 'light',
      allowLogout: false
    },
    customData: {
      userId: user.id
    },
    customer: {
      email: user.email
    }
  };

  console.log('[openTierCheckout] Opening checkout with payload:', {
    successUrl: payload.settings.successUrl,
    customData: payload.customData
  });

  // Mark checkout as in progress
  safeLocalStorage.setItem('inCheckout', 'true');

  try {
    paddle.Checkout.open(payload);
    console.log('[openTierCheckout] Checkout opened successfully');
  } catch (error) {
    console.error('[openTierCheckout] Error opening checkout:', error);
    safeLocalStorage.removeItem('inCheckout');
    alert('Failed to open payment system. Please try again.');
  }
}