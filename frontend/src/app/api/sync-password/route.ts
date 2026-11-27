import { NextResponse } from 'next/server';

// NOTE: Passwords are owned by Supabase Auth (auth.users) and are changed via
// supabase.auth.updateUser() on the client. The public.users.password_hash
// column previously held a plaintext mirror of the password, which was a
// security liability and is no longer stored. This endpoint is kept as a
// no-op so existing callers (reset-password flow) continue to succeed.
export async function POST(request: Request) {
  try {
    const { userId, newPassword } = await request.json();
    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }
    // Intentionally do not persist the password anywhere here.
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[sync-password API] Internal error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
