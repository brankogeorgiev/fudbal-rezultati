import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, authHeader ? supabaseAnonKey : supabaseServiceKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    const body = await req.json();
    const { match, goals, players } = body;

    // Validate match data
    if (!match || !match.home_team_id || !match.away_team_id) {
      return new Response(JSON.stringify({ error: "match.home_team_id and match.away_team_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create the match
    const { data: newMatch, error: matchError } = await supabase
      .from("matches")
      .insert({
        home_team_id: match.home_team_id,
        away_team_id: match.away_team_id,
        home_score: match.home_score ?? 0,
        away_score: match.away_score ?? 0,
        match_date: match.match_date ?? new Date().toISOString().split("T")[0],
      })
      .select(`*, home_team:teams!matches_home_team_id_fkey(id, name), away_team:teams!matches_away_team_id_fkey(id, name)`)
      .single();

    if (matchError) throw matchError;

    let goalsData = null;
    let playersData = null;

    // 2. Insert goals if provided
    if (goals && Array.isArray(goals) && goals.length > 0) {
      const goalsToInsert = goals.map((g: any) => ({
        match_id: newMatch.id,
        player_id: g.player_id,
        team_id: g.team_id,
        is_own_goal: g.is_own_goal ?? false,
      }));

      const { data, error } = await supabase
        .from("goals")
        .insert(goalsToInsert)
        .select(`*, player:players(id, name)`);

      if (error) throw error;
      goalsData = data;
    }

    // 3. Insert match players (lineups) if provided
    if (players && Array.isArray(players) && players.length > 0) {
      // Deduplicate by player_id (keep last entry) to avoid upsert conflict
      const uniqueMap = new Map<string, any>();
      for (const p of players) {
        uniqueMap.set(p.player_id, {
          match_id: newMatch.id,
          player_id: p.player_id,
          team_id: p.team_id,
        });
      }
      const playersToInsert = Array.from(uniqueMap.values());

      const { data, error } = await supabase
        .from("match_players")
        .upsert(playersToInsert, { onConflict: "match_id,player_id" })
        .select(`*, player:players(id, name), team:teams(id, name)`);

      if (error) throw error;
      playersData = data;
    }

    return new Response(JSON.stringify({
      match: newMatch,
      goals: goalsData,
      players: playersData,
    }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
