import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Dev-only debug endpoint that mirrors /api/session but is safe to call
// from the browser during development. Returns a minimal user object or null.
export async function GET() {
	try {
		const cookieStore = await cookies();
		const supabase = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				cookies: {
					getAll() {
						return cookieStore.getAll();
					},
				},
			}
		);

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ user: null }, { status: 200 });
		}

		const safeUser = {
			id: user.id,
			email: user.email,
			user_metadata: user.user_metadata || null,
		};

		return NextResponse.json({ user: safeUser }, { status: 200 });
	} catch (e) {
		return NextResponse.json({ user: null }, { status: 200 });
	}
}
