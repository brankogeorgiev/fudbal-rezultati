import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export const useSeasons = () => {
  return useQuery({
    queryKey: ["seasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as Season[];
    },
  });
};

export const useSeason = (seasonId?: string) => {
  return useQuery({
    queryKey: ["season", seasonId],
    queryFn: async () => {
      if (!seasonId) return null;
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .eq("name", seasonId)
        .maybeSingle();
      if (error) throw error;
      return data as Season | null;
    },
    enabled: !!seasonId,
  });
};

/** Reads season id from route params `/season/:seasonName/...` and fetches season. */
export const useCurrentSeason = () => {
  const { seasonName: seasonId } = useParams<{ seasonName: string }>();
  const query = useSeason(seasonId);
  return { seasonId, ...query };
};

export const useSeasonMatchCounts = () => {
  return useQuery({
    queryKey: ["season-match-counts"],
    queryFn: async () => {
      const { data: seasons, error: sErr } = await supabase
        .from("seasons")
        .select("id, start_date, end_date");
      if (sErr) throw sErr;
      const { data: matches, error: mErr } = await supabase
        .from("matches")
        .select("id, match_date");
      if (mErr) throw mErr;
      const counts: Record<string, number> = {};
      (seasons || []).forEach((s: any) => {
        counts[s.id] = (matches || []).filter(
          (m: any) => m.match_date >= s.start_date && m.match_date <= s.end_date
        ).length;
      });
      return counts;
    },
  });
};

export const useCreateSeason = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; startDate: string; endDate: string }) => {
      const { error } = await supabase.from("seasons").insert({
        name: data.name,
        start_date: data.startDate,
        end_date: data.endDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seasons"] });
      qc.invalidateQueries({ queryKey: ["season-match-counts"] });
      toast.success("Season created");
    },
    onError: (e) => toast.error("Failed to create season: " + e.message),
  });
};

export const useUpdateSeason = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, startDate, endDate }: { id: string; name: string; startDate: string; endDate: string }) => {
      const { error } = await supabase
        .from("seasons")
        .update({ name, start_date: startDate, end_date: endDate })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seasons"] });
      qc.invalidateQueries({ queryKey: ["season-match-counts"] });
      toast.success("Season updated");
    },
    onError: (e) => toast.error("Failed to update season: " + e.message),
  });
};

export const useDeleteSeason = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("seasons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seasons"] });
      qc.invalidateQueries({ queryKey: ["season-match-counts"] });
      toast.success("Season deleted");
    },
    onError: (e) => toast.error("Failed to delete season: " + e.message),
  });
};
