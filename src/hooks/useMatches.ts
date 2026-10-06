import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  match_date: string;
  created_at: string;
  home_team?: { id: string; name: string };
  away_team?: { id: string; name: string };
}

export interface Team {
  id: string;
  name: string;
}

export const useTeams = () => {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Team[];
    },
  });
};

export const useMatches = (range?: { startDate: string; endDate: string } | null) => {
  return useQuery({
    queryKey: ["matches", range?.startDate ?? null, range?.endDate ?? null],
    queryFn: async () => {
      let q = supabase
        .from("matches")
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)
        `)
        .order("match_date", { ascending: false });
      if (range) {
        q = q.gte("match_date", range.startDate).lte("match_date", range.endDate);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Match[];
    },
    enabled: range === undefined || range !== null,
  });
};

export const useCreateMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      homeTeamId: string;
      awayTeamId: string;
      homeScore: number;
      awayScore: number;
      matchDate: string;
    }) => {
      const { data: newMatch, error } = await supabase.from("matches").insert({
        home_team_id: data.homeTeamId,
        away_team_id: data.awayTeamId,
        home_score: data.homeScore,
        away_score: data.awayScore,
        match_date: data.matchDate,
      }).select().single();
      if (error) throw error;
      return newMatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.success("Match added successfully!");
    },
    onError: (error) => {
      toast.error("Failed to add match: " + error.message);
    },
  });
};

export const useUpdateMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        homeTeamId: string;
        awayTeamId: string;
        homeScore: number;
        awayScore: number;
        matchDate: string;
      };
    }) => {
      const { error } = await supabase
        .from("matches")
        .update({
          home_team_id: data.homeTeamId,
          away_team_id: data.awayTeamId,
          home_score: data.homeScore,
          away_score: data.awayScore,
          match_date: data.matchDate,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.success("Match updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update match: " + error.message);
    },
  });
};

export const useDeleteMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("matches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.success("Match deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete match: " + error.message);
    },
  });
};
