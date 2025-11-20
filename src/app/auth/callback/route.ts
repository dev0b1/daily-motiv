import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  // prefer explicit query param, otherwise fall back to post_auth_redirect cookie saved by client
  const cookieStore = await cookies();
  const cookieRedirect = cookieStore.get('post_auth_redirect')?.value;
  const redirectTo = searchParams.get('redirectTo') || (cookieRedirect ? decodeURIComponent(cookieRedirect) : undefined) || '/app';

  if (code) {
    if (process.env.NODE_ENV !== 'production') {
      try {
        const allCookies = cookieStore.getAll();
        console.log('[auth/callback] received code, redirectTo=', redirectTo, 'searchParams=', Object.fromEntries(searchParams.entries()), 'cookies=', allCookies.map(c=>({name:c.name,value:c.value})));
      } catch (e) {
        console.log('[auth/callback] debug log failed', e);
      }
    }
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options: any }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message || error);
    } else {
      console.log('[auth/callback] exchangeCodeForSession succeeded');
    }

    if (!error) {
      // clear the cookie so it doesn't linger
      try {
        cookieStore.set('post_auth_redirect', '', { path: '/', maxAge: 0 });
      } catch (e) {}
      // Redirect to checkout if user came from subscribe button
      if (redirectTo === '/checkout') {
        return NextResponse.redirect(new URL('/checkout', request.url));
      }
      // Otherwise redirect to the original page
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(new URL('/auth?error=authentication_failed', request.url));
}
