import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const useSupabase = !!(
    supabaseUrl && 
    supabaseKey && 
    supabaseUrl.startsWith('https://') && 
    !supabaseUrl.includes('your-project')
  );

  if (!useSupabase) {
    return NextResponse.json({ 
      connected: false, 
      error: 'Supabase URL and Service Role Key are missing or unconfigured. Offline database fallback has been deprecated.' 
    }, { status: 503 });
  }

  try {
    // Quick test query to ensure connection is valid
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    
    return NextResponse.json({ connected: true });
  } catch (err) {
    console.error("Database connection check failed:", err);
    return NextResponse.json({ 
      connected: false, 
      error: 'Unable to connect to the Supabase PostgreSQL database server. Server may be down or unreachable.' 
    }, { status: 503 });
  }
}
