import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeError } from "../_shared/security.ts";

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the user making the request
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: adminRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all users using admin API
    const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    // Get all roles
    const { data: roles, error: rolesError } = await supabaseClient
      .from("user_roles")
      .select("*");

    if (rolesError) {
      throw rolesError;
    }

    // Merge users with roles
    const usersWithRoles = users.map((u) => {
      const userRole = roles?.find((r) => r.user_id === u.id);
      return {
        id: u.id,
        email: u.email || "Unknown",
        role: userRole?.role || null,
        roleId: userRole?.id || null,
      };
    });

    return new Response(JSON.stringify(usersWithRoles), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: sanitizeError(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
