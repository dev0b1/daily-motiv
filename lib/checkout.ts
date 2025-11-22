"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

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
  
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData?.session?.user || null;
  } catch (e) {
    console.warn('Failed to get session', e);
    return null;
  }
}

// Helper to handle Paddle availability
function checkPaddleAvailability(): boolean {
  if (typeof window === 'undefined') return false;
  
  if (!(window as any).Paddle) {
    alert("Payment system is still loading. Please wait a moment and try again.");
    return false;
  }
  
  return true;
}

// Helper to setup Paddle event callbacks for cleanup
function setupPaddleCallbacks() {
  return {
    eventCallback: (data: any) => {
      // Clean up the checkout flag when modal closes or completes
      if (data.name === 'checkout.closed' || data.name === 'checkout.completed') {
        safeLocalStorage.removeItem('inCheckout');
      }
      
      // Optional: Log checkout events for debugging
      console.log('Paddle event:', data.name);
    }
  };
}

export async function openSingleCheckout(opts?: SingleCheckoutOpts) {
  const user = await resolveUser();

  if (!user) {
    // Redirect to pricing page for explicit sign-in
    if (typeof window !== 'undefined') {
      const payload: IntendedPurchase = {
        type: 'single',
        songId: opts?.songId || null,
        ts: Date.now()
      };
      safeLocalStorage.setItem('intendedPurchase', JSON.stringify(payload));
      window.location.href = '/pricing';
    }
    return;
  }

  if (!checkPaddleAvailability()) return;

  const singlePriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_SINGLE;

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
      ...setupPaddleCallbacks()
    },
    customData: {
      userId: user.id,
      ...(opts?.songId && { songId: opts.songId })
    }
  };

  // Mark checkout as in progress
  safeLocalStorage.setItem('inCheckout', 'true');

  try {
    (window as any).Paddle.Checkout.open(payload);
  } catch (error) {
    console.error('Failed to open Paddle checkout:', error);
    safeLocalStorage.removeItem('inCheckout');
    alert('Failed to open payment system. Please try again.');
  }
}

export async function openTierCheckout(tierId: string, priceId?: string) {
  const user = await resolveUser();

  if (!user) {
    // Redirect to pricing page for explicit sign-in
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

  if (!checkPaddleAvailability()) return;

  const priceToUse = priceId || process.env.NEXT_PUBLIC_PADDLE_PRICE_PREMIUM;

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
      ...setupPaddleCallbacks()
    },
    customData: {
      userId: user.id
    }
  };

  // Mark checkout as in progress
  safeLocalStorage.setItem('inCheckout', 'true');

  try {
    (window as any).Paddle.Checkout.open(payload);
  } catch (error) {
    console.error('Failed to open Paddle checkout:', error);
    safeLocalStorage.removeItem('inCheckout');
    alert('Failed to open payment system. Please try again.');
  }
}
