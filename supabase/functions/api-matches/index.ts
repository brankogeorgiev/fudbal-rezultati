import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeError, isValidUuid, isValidDateString, isValidScore } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, authHeader ? supabaseAnonKey : supabaseServiceKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} }
    });

    const url = new URL(req.url);
    const matchId = url.searchParams.get("id");

    // GET - Fetch matches
    if (req.method === "GET") {
      if (matchId) {
        const { data, error } = await supabase
          .from("matches")
          .select(`
            *,
            home_team:teams!matches_home_team_id_fkey(id, name),
            away_team:teams!matches_away_team_id_fkey(id, name)
          `)
          .eq("id", matchId)
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)
        `)
        .order("match_date", { ascending: false });
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST - Create match
    if (req.method === "POST") {
      const body = await req.json();
      const { home_team_id, away_team_id, home_score, away_score, match_date } = body;

      if (!isValidUuid(home_team_id) || !isValidUuid(away_team_id)) {
        return new Response(JSON.stringify({ error: "Valid home and away team IDs are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (match_date !== undefined && match_date !== null && !isValidDateString(match_date)) {
        return new Response(JSON.stringify({ error: "Invalid match date" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (
        (home_score !== undefined && home_score !== null && !isValidScore(home_score)) ||
        (away_score !== undefined && away_score !== null && !isValidScore(away_score))
      ) {
        return new Response(JSON.stringify({ error: "Scores must be non-negative integers" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("matches")
        .insert({ 
          home_team_id, 
          away_team_id, 
          home_score: home_score ?? 0, 
          away_score: away_score ?? 0, 
          match_date: match_date ?? new Date().toISOString().split('T')[0]
        })
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)
        `)
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT - Update match
    if (req.method === "PUT") {
      if (!matchId) {
        return new Response(JSON.stringify({ error: "Match ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { home_team_id, away_team_id, home_score, away_score, match_date } = body;

      const { data, error } = await supabase
        .from("matches")
        .update({ home_team_id, away_team_id, home_score, away_score, match_date })
        .eq("id", matchId)
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)
        `)
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE - Delete match
    if (req.method === "DELETE") {
      if (!matchId) {
        return new Response(JSON.stringify({ error: "Match ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchId);
      
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: sanitizeError(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
