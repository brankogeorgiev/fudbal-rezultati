import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Trophy, Users, CalendarIcon, Filter } from "lucide-react";
import FootballIcon from "@/components/icons/FootballIcon";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMatches, useTeams } from "@/hooks/useMatches";
import { usePlayers } from "@/hooks/usePlayers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

interface GoalWithPlayer {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  is_own_goal: boolean;
  player?: { id: string; name: string };
}

interface MatchPlayerRecord {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
}

const useAllGoals = () => {
  return useQuery({
    queryKey: ["all-goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select(`
          *,
          player:players(id, name)
        `);
      if (error) throw error;
      return data as GoalWithPlayer[];
    },
  });
};

const useAllMatchPlayers = () => {
  return useQuery({
    queryKey: ["all-match-players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_players")
        .select("*");
      if (error) throw error;
      return data as MatchPlayerRecord[];
    },
  });
};

const Statistics = () => {
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedTeam1, setSelectedTeam1] = useState<string>("all");
  const [selectedTeam2, setSelectedTeam2] = useState<string>("all");
  const [showAllScorers, setShowAllScorers] = useState(false);
  const [showAllOwnGoals, setShowAllOwnGoals] = useState(false);

  const { data: matches, isLoading: matchesLoading } = useMatches();
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: players, isLoading: playersLoading } = usePlayers();
  const { data: allGoals, isLoading: goalsLoading } = useAllGoals();
  const { data: allMatchPlayers, isLoading: matchPlayersLoading } = useAllMatchPlayers();

  const isLoading = matchesLoading || teamsLoading || playersLoading || goalsLoading || matchPlayersLoading;

  // Filter matches by date range and teams
  const filteredMatches = useMemo(() => {
    if (!matches) return [];

    return matches.filter((match) => {
      const matchDate = new Date(match.match_date);

      // Date filter
      if (startDate && matchDate < startDate) return false;
      if (endDate && matchDate > endDate) return false;

      // Team filter for head-to-head
      if (selectedTeam1 !== "all" && selectedTeam2 !== "all") {
        const matchTeams = [match.home_team_id, match.away_team_id];
        return matchTeams.includes(selectedTeam1) && matchTeams.includes(selectedTeam2);
      }

      // Single team filter
      if (selectedTeam1 !== "all") {
        return match.home_team_id === selectedTeam1 || match.away_team_id === selectedTeam1;
      }

      return true;
    });
  }, [matches, startDate, endDate, selectedTeam1, selectedTeam2]);

  // Calculate team statistics
  const teamStats = useMemo(() => {
    if (!teams || !filteredMatches) return [];

    return teams.map((team) => {
      const teamMatches = filteredMatches.filter(
        (m) => m.home_team_id === team.id || m.away_team_id === team.id
      );

      let wins = 0;
      let draws = 0;
      let losses = 0;
      let goalsScored = 0;
      let goalsConceded = 0;

      teamMatches.forEach((match) => {
        const isHome = match.home_team_id === team.id;
        const teamScore = isHome ? match.home_score : match.away_score;
        const opponentScore = isHome ? match.away_score : match.home_score;

        goalsScored += teamScore;
        goalsConceded += opponentScore;

        if (teamScore > opponentScore) wins++;
        else if (teamScore === opponentScore) draws++;
        else losses++;
      });

      const points = wins * 3 + draws;
      
      return {
        id: team.id,
        name: team.name,
        matches: teamMatches.length,
        wins,
        draws,
        losses,
        goalsScored,
        goalsConceded,
        goalDifference: goalsScored - goalsConceded,
        points,
      };
    }).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);
  }, [teams, filteredMatches]);

  // Check if a goal is an own goal using the stored is_own_goal field
  const isOwnGoal = (goal: GoalWithPlayer) => {
    return goal.is_own_goal === true;
  };

  // Calculate top scorers (excluding own goals)
  const topScorers = useMemo(() => {
    if (!allGoals || !players || !filteredMatches) return [];

    const matchIds = new Set(filteredMatches.map((m) => m.id));
    const filteredGoals = allGoals.filter((g) => matchIds.has(g.match_id) && !isOwnGoal(g));

    const scorerMap = new Map<string, { name: string; goals: number }>();

    filteredGoals.forEach((goal) => {
      const playerName = goal.player?.name || "Unknown";
      const existing = scorerMap.get(goal.player_id);
      if (existing) {
        existing.goals++;
      } else {
        scorerMap.set(goal.player_id, { name: playerName, goals: 1 });
      }
    });

    return Array.from(scorerMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10);
  }, [allGoals, players, filteredMatches]);

  // Calculate own goals
  const ownGoalScorers = useMemo(() => {
    if (!allGoals || !filteredMatches) return [];

    const matchIds = new Set(filteredMatches.map((m) => m.id));
    const ownGoals = allGoals.filter((g) => matchIds.has(g.match_id) && isOwnGoal(g));

    const scorerMap = new Map<string, { name: string; goals: number }>();

    ownGoals.forEach((goal) => {
      const playerName = goal.player?.name || "Unknown";
      const existing = scorerMap.get(goal.player_id);
      if (existing) {
        existing.goals++;
      } else {
        scorerMap.set(goal.player_id, { name: playerName, goals: 1 });
      }
    });

    return Array.from(scorerMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10);
  }, [allGoals, filteredMatches]);

  // Head-to-head stats
  const headToHead = useMemo(() => {
    if (selectedTeam1 === "all" || selectedTeam2 === "all" || selectedTeam1 === selectedTeam2) {
      return null;
    }

    const team1 = teams?.find((t) => t.id === selectedTeam1);
    const team2 = teams?.find((t) => t.id === selectedTeam2);

    if (!team1 || !team2) return null;

    let team1Wins = 0;
    let team2Wins = 0;
    let draws = 0;
    let team1Goals = 0;
    let team2Goals = 0;

    filteredMatches.forEach((match) => {
      const isTeam1Home = match.home_team_id === selectedTeam1;
      const t1Score = isTeam1Home ? match.home_score : match.away_score;
      const t2Score = isTeam1Home ? match.away_score : match.home_score;

      team1Goals += t1Score;
      team2Goals += t2Score;

      if (t1Score > t2Score) team1Wins++;
      else if (t2Score > t1Score) team2Wins++;
      else draws++;
    });

    return {
      team1: { name: team1.name, wins: team1Wins, goals: team1Goals },
      team2: { name: team2.name, wins: team2Wins, goals: team2Goals },
      draws,
      totalMatches: filteredMatches.length,
    };
  }, [selectedTeam1, selectedTeam2, teams, filteredMatches]);

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedTeam1("all");
    setSelectedTeam2("all");
  };

  const hasFilters = startDate || endDate || selectedTeam1 !== "all" || selectedTeam2 !== "all";

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="container max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-xl text-foreground">
            {t("statistics")}
          </h2>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {t("clearFilters")}
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="w-4 h-4" />
              {t("filters")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("from")}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {startDate ? format(startDate, "MMM d, yy") : t("start")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("to")}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {endDate ? format(endDate, "MMM d, yy") : t("end")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => date > new Date() || (startDate && date < startDate)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Team Selectors for Head-to-Head */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("team1")}</label>
                <Select value={selectedTeam1} onValueChange={setSelectedTeam1}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t("allTeams")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allTeams")}</SelectItem>
                    {teams?.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("team2")}</label>
                <Select value={selectedTeam2} onValueChange={setSelectedTeam2}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t("allTeams")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allTeams")}</SelectItem>
                    {teams?.filter((t) => t.id !== selectedTeam1).map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Head-to-Head Card */}
            {headToHead && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    {t("headToHead")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <p className="text-xs text-muted-foreground">
                      {headToHead.totalMatches} {t("matchesPlayed")}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-center">
                      <p className="font-semibold text-foreground truncate">
                        {headToHead.team1.name}
                      </p>
                      <p className="text-3xl font-bold text-primary mt-1">
                        {headToHead.team1.wins}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("wins")}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {headToHead.team1.goals} {t("goals")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-muted-foreground">
                        {headToHead.draws}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("draws")}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground truncate">
                        {headToHead.team2.name}
                      </p>
                      <p className="text-3xl font-bold text-primary mt-1">
                        {headToHead.team2.wins}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("wins")}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {headToHead.team2.goals} {t("goals")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Team Standings */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  {t("teamStandings")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamStats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    {t("noMatchesFound")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {teamStats.map((team, index) => (
                      <div
                        key={team.id}
                        className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground w-6">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-foreground">
                              {team.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {team.matches} {t("matches")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <p className="font-semibold text-green-500">{team.wins}</p>
                            <p className="text-xs text-muted-foreground">{t("w")}</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-muted-foreground">{team.draws}</p>
                            <p className="text-xs text-muted-foreground">{t("d")}</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-destructive">{team.losses}</p>
                            <p className="text-xs text-muted-foreground">{t("l")}</p>
                          </div>
                          <div className="text-center min-w-[40px]">
                            <p className="font-semibold text-foreground">{team.goalsScored}-{team.goalsConceded}</p>
                            <p className="text-xs text-muted-foreground">{t("gd")}</p>
                          </div>
                          <div className="text-center min-w-[32px]">
                            <p className="font-bold text-primary">{team.points}</p>
                            <p className="text-xs text-muted-foreground">{t("pts")}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Scorers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FootballIcon className="w-4 h-4 text-primary" />
                  {t("topScorers")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topScorers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    {t("noGoalsScored")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(showAllScorers ? topScorers : topScorers.slice(0, 3)).map((scorer, index) => (
                      <div
                        key={scorer.id}
                        className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "text-lg font-bold w-6",
                              index === 0
                                ? "text-yellow-500"
                                : index === 1
                                ? "text-gray-400"
                                : index === 2
                                ? "text-amber-600"
                                : "text-muted-foreground"
                            )}
                          >
                            {index + 1}
                          </span>
                          <p className="font-medium text-foreground">
                            {scorer.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-primary">
                            {scorer.goals}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t("goals")}
                          </span>
                        </div>
                      </div>
                    ))}
                    {topScorers.length > 3 && (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setShowAllScorers(!showAllScorers)}
                      >
                        {showAllScorers ? t("showLess") : t("showMore")}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Own Goals */}
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FootballIcon className="w-4 h-4 text-destructive" />
                  {t("ownGoals")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ownGoalScorers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    {t("noOwnGoals")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(showAllOwnGoals ? ownGoalScorers : ownGoalScorers.slice(0, 3)).map((scorer, index) => (
                      <div
                        key={scorer.id}
                        className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold w-6 text-destructive">
                            {index + 1}
                          </span>
                          <p className="font-medium text-foreground">
                            {scorer.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-destructive">
                            {scorer.goals}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            OG
                          </span>
                        </div>
                      </div>
                    ))}
                    {ownGoalScorers.length > 3 && (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setShowAllOwnGoals(!showAllOwnGoals)}
                      >
                        {showAllOwnGoals ? t("showLess") : t("showMore")}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Statistics;
