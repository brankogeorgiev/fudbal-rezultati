import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeError, validateName, isValidUuid } from "../_shared/security.ts";

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
    const teamId = url.searchParams.get("id");

    // GET - Fetch teams
    if (req.method === "GET") {
      if (teamId) {
        const { data, error } = await supabase
          .from("teams")
          .select("*")
          .eq("id", teamId)
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST - Create team
    if (req.method === "POST") {
      const body = await req.json();
      const nameCheck = validateName(body?.name);
      if (!nameCheck.ok) {
        return new Response(JSON.stringify({ error: nameCheck.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("teams")
        .insert({ name: nameCheck.value })
        .select()
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT - Update team
    if (req.method === "PUT") {
      if (!isValidUuid(teamId)) {
        return new Response(JSON.stringify({ error: "Valid Team ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const nameCheck = validateName(body?.name);
      if (!nameCheck.ok) {
        return new Response(JSON.stringify({ error: nameCheck.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("teams")
        .update({ name: nameCheck.value })
        .eq("id", teamId)
        .select()
        .single();
      
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE - Delete team
    if (req.method === "DELETE") {
      if (!teamId) {
        return new Response(JSON.stringify({ error: "Team ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);
      
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
