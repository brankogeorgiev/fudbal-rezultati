import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeError } from "../_shared/security.ts";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all data
    const [teamsRes, playersRes, matchesRes, goalsRes, matchPlayersRes] = await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase.from("players").select("*, default_team:teams(name)").order("name"),
      supabase.from("matches").select("*, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)").order("match_date", { ascending: false }),
      supabase.from("goals").select("*, player:players(name), team:teams(name), match:matches(match_date)"),
      supabase.from("match_players").select("*, player:players(name), team:teams(name), match:matches(match_date)"),
    ]);

    if (teamsRes.error) throw teamsRes.error;
    if (playersRes.error) throw playersRes.error;
    if (matchesRes.error) throw matchesRes.error;
    if (goalsRes.error) throw goalsRes.error;
    if (matchPlayersRes.error) throw matchPlayersRes.error;

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Teams sheet
    const teamsData = teamsRes.data.map((t) => ({
      ID: t.id,
      Name: t.name,
      "Created At": t.created_at,
    }));
    const teamsSheet = XLSX.utils.json_to_sheet(teamsData);
    XLSX.utils.book_append_sheet(workbook, teamsSheet, "Teams");

    // Players sheet
    const playersData = playersRes.data.map((p) => ({
      ID: p.id,
      Name: p.name,
      "Default Team": p.default_team?.name || "None",
      "Created At": p.created_at,
    }));
    const playersSheet = XLSX.utils.json_to_sheet(playersData);
    XLSX.utils.book_append_sheet(workbook, playersSheet, "Players");

    // Matches sheet
    const matchesData = matchesRes.data.map((m) => ({
      ID: m.id,
      Date: m.match_date,
      "Home Team": m.home_team?.name,
      "Home Score": m.home_score,
      "Away Team": m.away_team?.name,
      "Away Score": m.away_score,
      "Created At": m.created_at,
    }));
    const matchesSheet = XLSX.utils.json_to_sheet(matchesData);
    XLSX.utils.book_append_sheet(workbook, matchesSheet, "Matches");

    // Goals sheet
    const goalsData = goalsRes.data.map((g) => ({
      ID: g.id,
      "Match Date": g.match?.match_date,
      Player: g.player?.name,
      Team: g.team?.name,
      "Created At": g.created_at,
    }));
    const goalsSheet = XLSX.utils.json_to_sheet(goalsData);
    XLSX.utils.book_append_sheet(workbook, goalsSheet, "Goals");

    // Match Players sheet
    const matchPlayersData = matchPlayersRes.data.map((mp) => ({
      ID: mp.id,
      "Match Date": mp.match?.match_date,
      Player: mp.player?.name,
      Team: mp.team?.name,
      "Created At": mp.created_at,
    }));
    const matchPlayersSheet = XLSX.utils.json_to_sheet(matchPlayersData);
    XLSX.utils.book_append_sheet(workbook, matchPlayersSheet, "Match Players");

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Create filename with timestamp
    const now = new Date();
    const filename = `data-export-${now.toISOString().split("T")[0]}.xlsx`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("data-exports")
      .upload(filename, excelBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    console.log(`Successfully exported data to ${filename}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        filename,
        message: `Data exported successfully to ${filename}`,
        stats: {
          teams: teamsRes.data.length,
          players: playersRes.data.length,
          matches: matchesRes.data.length,
          goals: goalsRes.data.length,
          matchPlayers: matchPlayersRes.data.length,
        }
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
