import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { format, getDay, getMonth } from "date-fns";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlayers } from "@/hooks/usePlayers";
import ViewOnlyPitch from "@/components/ViewOnlyPitch";
import { useLanguage } from "@/i18n/LanguageContext";

const MatchDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: allPlayers } = usePlayers();
  const { t } = useLanguage();

  const getFullDayName = (date: Date) => {
    const dayIndex = getDay(date);
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    return t(dayKeys[dayIndex]);
  };

  const getMonthName = (date: Date) => {
    const monthIndex = getMonth(date);
    const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'] as const;
    return t(monthKeys[monthIndex]);
  };

  const formatLocalizedDate = (date: Date) => {
    const dayName = getFullDayName(date);
    const monthName = getMonthName(date);
    const day = format(date, "d");
    const year = format(date, "yyyy");
    return `${dayName}, ${monthName} ${day}, ${year}`;
  };

  // Fetch match details
  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: ["match", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch goals for this match
  const { data: goals } = useQuery({
    queryKey: ["goals", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("goals")
        .select(`
          *,
          player:players(id, name)
        `)
        .eq("match_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch match players
  const { data: matchPlayers } = useQuery({
    queryKey: ["match_players", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("match_players")
        .select("*")
        .eq("match_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const isLoading = matchLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="container max-w-lg mx-auto px-4 py-6">
          <Skeleton className="h-8 w-24 mb-6" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="container max-w-lg mx-auto px-4 py-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2 mb-6">
            <ArrowLeft className="w-4 h-4" />
            {t("back")}
          </Button>
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t("matchNotFound")}</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const homeGoals = goals?.filter((g) => g.team_id === match.home_team_id) || [];
  const awayGoals = goals?.filter((g) => g.team_id === match.away_team_id) || [];

  const homePlayers = matchPlayers
    ?.filter((mp) => mp.team_id === match.home_team_id)
    .map((mp, index) => ({ id: mp.player_id, positionIndex: index })) || [];
  
  const awayPlayers = matchPlayers
    ?.filter((mp) => mp.team_id === match.away_team_id)
    .map((mp, index) => ({ id: mp.player_id, positionIndex: index })) || [];

  const getPlayerName = (playerId: string) => {
    const player = allPlayers?.find((p) => p.id === playerId);
    return player?.name || "Unknown";
  };

  // Check if a goal is an own goal using the stored is_own_goal field
  const isOwnGoal = (goalId: string) => {
    const goal = goals?.find((g) => g.id === goalId);
    return (goal as any)?.is_own_goal === true;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="container max-w-lg mx-auto px-4 py-6">
        {/* Back button */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t("back")}
          </Button>
        </div>

        {/* Match score card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center flex-1">
                <div className="font-display font-bold text-lg">
                  {match.home_team?.name}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`score-badge text-2xl px-4 py-2 rounded-lg font-bold ${
                  match.home_score > match.away_score 
                    ? 'bg-green-500 text-white' 
                    : match.home_score < match.away_score 
                      ? 'bg-red-500 text-white' 
                      : 'bg-yellow-500 text-white'
                }`}>
                  {match.home_score}
                </span>
                <span className="text-muted-foreground font-bold text-xl">:</span>
                <span className={`score-badge text-2xl px-4 py-2 rounded-lg font-bold ${
                  match.away_score > match.home_score 
                    ? 'bg-green-500 text-white' 
                    : match.away_score < match.home_score 
                      ? 'bg-red-500 text-white' 
                      : 'bg-yellow-500 text-white'
                }`}>
                  {match.away_score}
                </span>
              </div>
              <div className="text-center flex-1">
                <div className="font-display font-bold text-lg">
                  {match.away_team?.name}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground text-sm">
              <Calendar className="w-4 h-4" />
              {formatLocalizedDate(new Date(match.match_date))}
            </div>
          </CardContent>
        </Card>

        {/* Football pitch with players - shown above goal scorers */}
        {(homePlayers.length > 0 || awayPlayers.length > 0) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">{t("lineup")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ViewOnlyPitch
                homeTeamName={match.home_team?.name || "Home"}
                awayTeamName={match.away_team?.name || "Away"}
                homePlayers={homePlayers}
                awayPlayers={awayPlayers}
                allPlayers={allPlayers || []}
              />
            </CardContent>
          </Card>
        )}

        {/* Goal scorers */}
        {(homeGoals.length > 0 || awayGoals.length > 0) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">{t("goalScorers")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-1 gap-4">
                {/* Home goals */}
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground font-medium mb-2">
                    {match.home_team?.name}
                  </div>
                  {homeGoals.length > 0 ? (
                    homeGoals.map((goal) => {
                      const ownGoal = isOwnGoal(goal.id);
                      return (
                        <button
                          key={goal.id}
                          onClick={() => goal.player?.id && navigate(`/player/${goal.player.id}`)}
                          className={`flex items-center gap-2 text-sm rounded-full px-2 py-1 w-full text-left hover:bg-muted/50 transition-colors ${
                            ownGoal ? "bg-destructive/20 border border-destructive/50" : ""
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            ownGoal ? "bg-destructive" : "bg-team-home"
                          }`}>
                            <User className={`w-3 h-3 ${ownGoal ? "text-white" : "text-purple-600"}`} />
                          </div>
                          <span className={ownGoal ? "text-destructive font-medium" : ""}>
                            {goal.player?.name || "Unknown"}
                            {ownGoal && <span className="ml-1 text-xs">(OG)</span>}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-sm text-muted-foreground">{t("noGoals")}</span>
                  )}
                </div>

                {/* Away goals */}
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground font-medium mb-2">
                    {match.away_team?.name}
                  </div>
                  {awayGoals.length > 0 ? (
                    awayGoals.map((goal) => {
                      const ownGoal = isOwnGoal(goal.id);
                      return (
                        <button
                          key={goal.id}
                          onClick={() => goal.player?.id && navigate(`/player/${goal.player.id}`)}
                          className={`flex items-center gap-2 text-sm rounded-full px-2 py-1 w-full text-left hover:bg-muted/50 transition-colors ${
                            ownGoal ? "bg-destructive/20 border border-destructive/50" : ""
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            ownGoal ? "bg-destructive" : "bg-team-away"
                          }`}>
                            <User className={`w-3 h-3 text-white`} />
                          </div>
                          <span className={ownGoal ? "text-destructive font-medium" : ""}>
                            {goal.player?.name || "Unknown"}
                            {ownGoal && <span className="ml-1 text-xs">(OG)</span>}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-sm text-muted-foreground">{t("noGoals")}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default MatchDetails;
