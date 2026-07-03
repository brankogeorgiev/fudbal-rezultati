import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeError, isValidUuid } from "../_shared/security.ts";

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
    const matchId = url.searchParams.get("match_id");
    const matchPlayerId = url.searchParams.get("id");

    // GET - Fetch match players
    if (req.method === "GET") {
      if (matchPlayerId) {
        const { data, error } = await supabase
          .from("match_players")
          .select(`*, player:players(id, name), team:teams(id, name)`)
          .eq("id", matchPlayerId)
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      let query = supabase
        .from("match_players")
        .select(`*, player:players(id, name), team:teams(id, name)`);
      
      if (matchId) {
        query = query.eq("match_id", matchId);
      }
      
      const { data, error } = await query.order("created_at");
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST - Create match player(s)
    if (req.method === "POST") {
      const body = await req.json();
      
      // Support both single and batch
      if (Array.isArray(body)) {
        const invalid = body.some(
          (mp) => !isValidUuid(mp?.match_id) || !isValidUuid(mp?.player_id) || !isValidUuid(mp?.team_id),
        );
        if (invalid) {
          return new Response(JSON.stringify({ error: "Each entry requires valid match_id, player_id, and team_id" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const matchPlayers = body.map(mp => ({
          match_id: mp.match_id,
          player_id: mp.player_id,
          team_id: mp.team_id,
        }));
        
        const { data, error } = await supabase
          .from("match_players")
          .upsert(matchPlayers, { onConflict: "match_id,player_id" })
          .select(`*, player:players(id, name), team:teams(id, name)`);
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const { match_id, player_id, team_id } = body;

        if (!isValidUuid(match_id) || !isValidUuid(player_id) || !isValidUuid(team_id)) {
          return new Response(JSON.stringify({ error: "Valid match_id, player_id, and team_id are required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data, error } = await supabase
          .from("match_players")
          .insert({ match_id, player_id, team_id })
          .select(`*, player:players(id, name), team:teams(id, name)`)
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // DELETE - Delete match player(s)
    if (req.method === "DELETE") {
      if (matchPlayerId) {
        const { error } = await supabase
          .from("match_players")
          .delete()
          .eq("id", matchPlayerId);
        
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (matchId) {
        const { error } = await supabase
          .from("match_players")
          .delete()
          .eq("match_id", matchId);
        
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Match Player ID or Match ID is required" }), {
        status: 400,
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
