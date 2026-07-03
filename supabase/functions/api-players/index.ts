import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeError, validateName } from "../_shared/security.ts";

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
    const playerId = url.searchParams.get("id");

    // GET - Fetch players
    if (req.method === "GET") {
      if (playerId) {
        const { data, error } = await supabase
          .from("players")
          .select(`*, default_team:teams(id, name)`)
          .eq("id", playerId)
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const { data, error } = await supabase
        .from("players")
        .select(`*, default_team:teams(id, name)`)
        .order("name");
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST - Create player
    if (req.method === "POST") {
      const body = await req.json();
      const { default_team_id } = body;
      const nameCheck = validateName(body?.name);
      if (!nameCheck.ok) {
        return new Response(JSON.stringify({ error: nameCheck.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("players")
        .insert({ name: nameCheck.value, default_team_id })
        .select(`*, default_team:teams(id, name)`)
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT - Update player
    if (req.method === "PUT") {
      if (!playerId) {
        return new Response(JSON.stringify({ error: "Player ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { default_team_id } = body;
      const nameCheck = validateName(body?.name);
      if (!nameCheck.ok) {
        return new Response(JSON.stringify({ error: nameCheck.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("players")
        .update({ name: nameCheck.value, default_team_id })
        .eq("id", playerId)
        .select(`*, default_team:teams(id, name)`)
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE - Delete player
    if (req.method === "DELETE") {
      if (!playerId) {
        return new Response(JSON.stringify({ error: "Player ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("players")
        .delete()
        .eq("id", playerId);
      
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
