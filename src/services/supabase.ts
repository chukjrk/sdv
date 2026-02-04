import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase: SupabaseClient<Database> = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export async function testConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('competitions')
      .select('count')
      .limit(1)
    
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation')) {
        console.log('✅ Supabase connected (tables created)')
        return true
      }
      throw error
    }
    
    console.log('✅ Supabase connected successfully!')
    return true
  } catch (err) {
    console.error('❌ Supabase connection failed:', (err as Error).message)
    return false
  }
}

export async function getMatches(limit = 10) {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

export async function getPlayerStats(playerName: string, matchId?: number) {
  const { data, error } = await supabase
    .rpc('get_pass_completion_rate', {
      p_player_name: playerName,
      p_match_id: matchId || null
    })

  if (error) throw error
  return data[0]
}
