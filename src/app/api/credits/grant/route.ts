import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { refillCredits } from '@/lib/db-service';

export async function POST(request: NextRequest) {
  try {
    // Prefer server-side session detection via Supabase cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          }
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'not_authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const amount = (body && typeof body.amount === 'number') ? body.amount : 1;

    const ok = await refillCredits(user.id, amount);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'failed_to_refill' }, { status: 500 });
    }

    return NextResponse.json({ success: true, creditsGranted: amount });
  } catch (error) {
    console.error('Grant credits error:', error);
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}
