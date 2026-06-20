import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Target, CircleDot } from "lucide-react";
import { format, getDay, getMonth } from "date-fns";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

interface PlayerMatchRow {
  matchId: string;
  matchDate: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  playedForTeamId: string;
  playedForTeamName: string;
  goals: number;
  ownGoals: number;
}

const PlayerDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const getFullDayName = (date: Date) => {
    const dayIndex = getDay(date);
    const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
    return t(dayKeys[dayIndex]);
  };

  const getMonthName = (date: Date) => {
    const monthIndex = getMonth(date);
    const monthKeys = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"] as const;
    return t(monthKeys[monthIndex]);
  };

  const formatLocalizedDate = (date: Date) => {
    return `${getFullDayName(date)}, ${getMonthName(date)} ${format(date, "d")}, ${format(date, "yyyy")}`;
  };

  const getResult = (row: PlayerMatchRow): "W" | "L" | "D" => {
    if (row.homeScore === row.awayScore) return "D";
    const playedHome = row.playedForTeamId === row.homeTeamId;
    const playerScore = playedHome ? row.homeScore : row.awayScore;
    const oppScore = playedHome ? row.awayScore : row.homeScore;
    return playerScore > oppScore ? "W" : "L";
  };

  const { data: player, isLoading: playerLoading } = useQuery({
    queryKey: ["player", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("players")
        .select("id, name")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: rows, isLoading: rowsLoading } = useQuery({
    queryKey: ["player_matches", id],
    queryFn: async (): Promise<PlayerMatchRow[]> => {
      if (!id) return [];

      // Matches the player participated in
      const { data: mps, error: mpError } = await supabase
        .from("match_players")
        .select("match_id, team_id")
        .eq("player_id", id);
      if (mpError) throw mpError;
      if (!mps || mps.length === 0) return [];

      const matchIds = mps.map((m) => m.match_id);

      const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select(`
          id, match_date, home_team_id, away_team_id, home_score, away_score,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)
        `)
        .in("id", matchIds);
      if (matchError) throw matchError;

      const { data: goals, error: goalError } = await supabase
        .from("goals")
        .select("match_id, is_own_goal")
        .eq("player_id", id)
        .in("match_id", matchIds);
      if (goalError) throw goalError;

      const built: PlayerMatchRow[] = (matches || []).map((match: any) => {
        const mp = mps.find((m) => m.match_id === match.id);
        const playedForTeamId = mp?.team_id ?? "";
        const playedForTeamName =
          playedForTeamId === match.home_team_id
            ? match.home_team?.name
            : playedForTeamId === match.away_team_id
              ? match.away_team?.name
              : "—";
        const matchGoals = (goals || []).filter((g) => g.match_id === match.id);
        return {
          matchId: match.id,
          matchDate: match.match_date,
          homeTeamName: match.home_team?.name || "—",
          awayTeamName: match.away_team?.name || "—",
          homeTeamId: match.home_team_id,
          awayTeamId: match.away_team_id,
          homeScore: match.home_score,
          awayScore: match.away_score,
          playedForTeamId,
          playedForTeamName: playedForTeamName || "—",
          goals: matchGoals.filter((g) => !g.is_own_goal).length,
          ownGoals: matchGoals.filter((g) => g.is_own_goal).length,
        };
      });

      built.sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());
      return built;
    },
    enabled: !!id,
  });

  const isLoading = playerLoading || rowsLoading;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="container max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t("back")}
          </Button>
        </div>

        {/* Player header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="font-display font-bold text-xl text-foreground">
                  {playerLoading ? <Skeleton className="h-6 w-32" /> : player?.name || t("playerNotFound")}
                </div>
                <div className="text-sm text-muted-foreground">{t("matchHistory")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match history rows */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))
          ) : rows && rows.length > 0 ? (
            rows.map((row) => {
              const result = getResult(row);
              const resultColor =
                result === "W" ? "bg-green-500" : result === "L" ? "bg-red-500" : "bg-muted-foreground";
              const homeBold = row.playedForTeamId === row.homeTeamId ? "font-bold" : "font-medium";
              const awayBold = row.playedForTeamId === row.awayTeamId ? "font-bold" : "font-medium";
              const matchDate = new Date(row.matchDate);
              const hasStats = row.goals > 0 || row.ownGoals > 0;
              return (
                <button
                  key={row.matchId}
                  onClick={() => navigate(`/match/${row.matchId}`)}
                  className="result-card w-full text-left animate-fade-in"
                >
                  <div className="flex items-center gap-3">
                    {/* Date column */}
                    <div className="flex flex-col items-center justify-center w-14 shrink-0 text-muted-foreground">
                      <span className="text-xs font-medium leading-tight">{format(matchDate, "dd/MM/yy")}</span>
                      <span className="text-xs">FT</span>
                    </div>

                    {/* Teams + scores */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-foreground truncate ${homeBold}`}>{row.homeTeamName}</span>
                        <span className={`text-foreground tabular-nums ${homeBold}`}>{row.homeScore}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className={`text-foreground truncate ${awayBold}`}>{row.awayTeamName}</span>
                        <span className={`text-foreground tabular-nums ${awayBold}`}>{row.awayScore}</span>
                      </div>
                    </div>

                    {/* Stats + result */}
                    <div className="flex items-center gap-2 shrink-0">
                      {hasStats && (
                        <div className="flex items-center gap-1.5">
                          {row.goals > 0 && (
                            <span className="flex items-center gap-0.5 text-foreground font-semibold text-xs">
                              <Target className="w-3 h-3 text-primary" />
                              {row.goals}
                            </span>
                          )}
                          {row.ownGoals > 0 && (
                            <span className="flex items-center gap-0.5 text-destructive font-semibold text-xs">
                              <CircleDot className="w-3 h-3" />
                              {row.ownGoals}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Result badge */}
                      <div className={`px-2 py-1 rounded-md ${resultColor} flex items-center justify-center text-white font-bold text-xs`}>
                        {result}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("noMatchesPlayed")}</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default PlayerDetails;
