import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Use Service Role Key to bypass RLS and update the users table securely
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: newPassword })
      .eq('user_id', userId);

    if (error) {
      console.error('[sync-password API] DB sync error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[sync-password API] Internal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
