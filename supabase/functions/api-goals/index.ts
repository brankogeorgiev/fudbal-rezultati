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
    const goalId = url.searchParams.get("id");

    // GET - Fetch goals
    if (req.method === "GET") {
      if (goalId) {
        const { data, error } = await supabase
          .from("goals")
          .select(`*, player:players(id, name)`)
          .eq("id", goalId)
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      let query = supabase
        .from("goals")
        .select(`*, player:players(id, name)`);
      
      if (matchId) {
        query = query.eq("match_id", matchId);
      }
      
      const { data, error } = await query.order("created_at");
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST - Create goal(s)
    if (req.method === "POST") {
      const body = await req.json();
      
      // Support both single goal and batch goals
      if (Array.isArray(body)) {
        // Batch insert
        const invalid = body.some(
          (g) => !isValidUuid(g?.match_id) || !isValidUuid(g?.player_id) || !isValidUuid(g?.team_id),
        );
        if (invalid) {
          return new Response(JSON.stringify({ error: "Each goal requires valid match_id, player_id, and team_id" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const goals = body.map(g => ({
          match_id: g.match_id,
          player_id: g.player_id,
          team_id: g.team_id,
          is_own_goal: g.is_own_goal === true,
        }));
        
        const { data, error } = await supabase
          .from("goals")
          .insert(goals)
          .select(`*, player:players(id, name)`);
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Single insert
        const { match_id, player_id, team_id, is_own_goal } = body;
        
        if (!match_id || !player_id || !team_id) {
          return new Response(JSON.stringify({ error: "match_id, player_id, and team_id are required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data, error } = await supabase
          .from("goals")
          .insert({ match_id, player_id, team_id, is_own_goal: is_own_goal ?? false })
          .select(`*, player:players(id, name)`)
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // DELETE - Delete goal(s)
    if (req.method === "DELETE") {
      // Delete by goal ID
      if (goalId) {
        const { error } = await supabase
          .from("goals")
          .delete()
          .eq("id", goalId);
        
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Delete all goals for a match
      if (matchId) {
        const { error } = await supabase
          .from("goals")
          .delete()
          .eq("match_id", matchId);
        
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Goal ID or Match ID is required" }), {
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
