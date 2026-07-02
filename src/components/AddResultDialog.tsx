import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Minus, X, User, CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import FootballPitch from "./FootballPitch";
import PlayerSelectModal from "./PlayerSelectModal";
import { useLanguage } from "@/i18n/LanguageContext";

interface Team {
  id: string;
  name: string;
}

interface Player {
  id: string;
  name: string;
  default_team_id: string | null;
  isTemporary?: boolean;
}

interface PitchPlayer {
  id: string;
  positionIndex: number;
}

interface Goal {
  id: string;
  player_id: string;
  team_id: string;
}

interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  match_date: string;
}

interface MatchPlayerData {
  id: string;
  player_id: string;
  team_id: string;
}

interface AddResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  players: Player[];
  onSave: (data: {
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
    matchDate: string;
    homeGoals: string[];
    awayGoals: string[];
    homePitchPlayers: PitchPlayer[];
    awayPitchPlayers: PitchPlayer[];
    tempPlayersToCreate: { tempId: string; name: string }[];
  }) => void;
  editMatch?: Match | null;
  existingGoals?: Goal[];
  existingMatchPlayers?: MatchPlayerData[];
  isLoadingEditData?: boolean;
}

const AddResultDialog = ({
  open,
  onOpenChange,
  teams,
  players: initialPlayers,
  onSave,
  editMatch,
  existingGoals = [],
  existingMatchPlayers = [],
  isLoadingEditData = false,
}: AddResultDialogProps) => {
  const { t } = useLanguage();
  const [homeTeamId, setHomeTeamId] = useState<string>("");
  const [awayTeamId, setAwayTeamId] = useState<string>("");
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [matchDate, setMatchDate] = useState<Date>(new Date());
  const [homeGoals, setHomeGoals] = useState<string[]>([]);
  const [awayGoals, setAwayGoals] = useState<string[]>([]);
  const [homePitchPlayers, setHomePitchPlayers] = useState<PitchPlayer[]>([]);
  const [awayPitchPlayers, setAwayPitchPlayers] = useState<PitchPlayer[]>([]);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [selectingForTeam, setSelectingForTeam] = useState<"home" | "away">("home");
  const [selectingPosition, setSelectingPosition] = useState<number>(0);
  const [selectingForGoal, setSelectingForGoal] = useState(false);
  
  // Local players list including temporary ones
  const [allPlayers, setAllPlayers] = useState<Player[]>(initialPlayers);

  // Reset players when initial players change
  useEffect(() => {
    setAllPlayers(initialPlayers);
  }, [initialPlayers]);

  const initializedForOpenRef = useRef(false);

  useEffect(() => {
    // Prevent resetting user edits while the dialog is open.
    // We only initialize once per open, and wait for edit data to load.
    if (!open) {
      initializedForOpenRef.current = false;
      return;
    }

    // If editing, wait until the data is loaded before initializing
    if (editMatch && isLoadingEditData) {
      return;
    }

    if (initializedForOpenRef.current) return;
    initializedForOpenRef.current = true;

    if (editMatch) {
      setHomeTeamId(editMatch.home_team_id);
      setAwayTeamId(editMatch.away_team_id);
      setHomeScore(editMatch.home_score);
      setAwayScore(editMatch.away_score);
      setMatchDate(new Date(editMatch.match_date));

      const homeGoalsList = existingGoals
        .filter((g) => g.team_id === editMatch.home_team_id)
        .map((g) => g.player_id);
      const awayGoalsList = existingGoals
        .filter((g) => g.team_id === editMatch.away_team_id)
        .map((g) => g.player_id);

      setHomeGoals(homeGoalsList);
      setAwayGoals(awayGoalsList);

      // Load existing match players
      const homePlayers = existingMatchPlayers
        .filter((mp) => mp.team_id === editMatch.home_team_id)
        .map((mp, index) => ({ id: mp.player_id, positionIndex: index }));
      const awayPlayers = existingMatchPlayers
        .filter((mp) => mp.team_id === editMatch.away_team_id)
        .map((mp, index) => ({ id: mp.player_id, positionIndex: index }));

      setHomePitchPlayers(homePlayers);
      setAwayPitchPlayers(awayPlayers);
    } else {
      setHomeTeamId(teams[0]?.id || "");
      setAwayTeamId(teams[1]?.id || "");
      setHomeScore(0);
      setAwayScore(0);
      setMatchDate(new Date());
      setHomeGoals([]);
      setAwayGoals([]);
      setHomePitchPlayers([]);
      setAwayPitchPlayers([]);
    }
  }, [open, editMatch, teams, existingGoals, existingMatchPlayers, isLoadingEditData]);

  const handleSave = async () => {
    if (!homeTeamId || !awayTeamId) return;
    
    // Collect all temporary players used in pitch or goals
    const usedTempPlayers = new Map<string, Player>();
    
    [...homePitchPlayers, ...awayPitchPlayers].forEach(pp => {
      const player = allPlayers.find(p => p.id === pp.id);
      if (player?.isTemporary) {
        usedTempPlayers.set(pp.id, player);
      }
    });
    
    [...homeGoals, ...awayGoals].forEach(playerId => {
      const player = allPlayers.find(p => p.id === playerId);
      if (player?.isTemporary) {
        usedTempPlayers.set(playerId, player);
      }
    });
    
    // Create a mapping from temp ID to real ID (will be populated by parent)
    const tempIdToRealId = new Map<string, string>();
    
    // For now, we'll pass temp players info to parent via a different approach
    // We need to save temp players first - so we pass them along
    const tempPlayersToCreate = Array.from(usedTempPlayers.values()).map(p => ({
      tempId: p.id,
      name: p.name,
    }));
    
    // Map players, keeping temp IDs (parent will handle creation)
    const finalHomePitchPlayers = homePitchPlayers.map(pp => ({
      ...pp,
      tempId: allPlayers.find(p => p.id === pp.id)?.isTemporary ? pp.id : undefined,
    }));
    
    const finalAwayPitchPlayers = awayPitchPlayers.map(pp => ({
      ...pp,
      tempId: allPlayers.find(p => p.id === pp.id)?.isTemporary ? pp.id : undefined,
    }));
    
    onSave({
      homeTeamId,
      awayTeamId,
      homeScore,
      awayScore,
      matchDate: format(matchDate, "yyyy-MM-dd"),
      homeGoals,
      awayGoals,
      homePitchPlayers,
      awayPitchPlayers,
      tempPlayersToCreate,
    });
    onOpenChange(false);
  };

  const handleOpenPlayerModal = (team: "home" | "away", positionIndex: number, forGoal = false) => {
    setSelectingForTeam(team);
    setSelectingPosition(positionIndex);
    setSelectingForGoal(forGoal);
    setPlayerModalOpen(true);
  };

  const handlePlayerSelected = (playerId: string) => {
    if (selectingForGoal) {
      // Adding a goal scorer - only increase score if goalscorers exceed current score
      if (selectingForTeam === "home") {
        const newGoals = [...homeGoals, playerId];
        setHomeGoals(newGoals);
        if (newGoals.length > homeScore) {
          setHomeScore(newGoals.length);
        }
      } else {
        const newGoals = [...awayGoals, playerId];
        setAwayGoals(newGoals);
        if (newGoals.length > awayScore) {
          setAwayScore(newGoals.length);
        }
      }
    } else {
      // Adding to pitch
      if (selectingForTeam === "home") {
        setHomePitchPlayers((prev) => {
          // Remove any existing player at this position
          const filtered = prev.filter((p) => p.positionIndex !== selectingPosition);
          return [...filtered, { id: playerId, positionIndex: selectingPosition }];
        });
      } else {
        setAwayPitchPlayers((prev) => {
          const filtered = prev.filter((p) => p.positionIndex !== selectingPosition);
          return [...filtered, { id: playerId, positionIndex: selectingPosition }];
        });
      }
    }
  };

  const handleRemoveFromPitch = (team: "home" | "away", playerId: string) => {
    if (team === "home") {
      setHomePitchPlayers((prev) => prev.filter((p) => p.id !== playerId));
    } else {
      setAwayPitchPlayers((prev) => prev.filter((p) => p.id !== playerId));
    }
  };

  const handleChangePlayerOnPitch = (team: "home" | "away", positionIndex: number, currentPlayerId: string) => {
    // Remove current player first, then open modal to select new one
    handleRemoveFromPitch(team, currentPlayerId);
    handleOpenPlayerModal(team, positionIndex, false);
  };

  // Get players already on pitch (both teams) to exclude from selection
  const getPlayersOnPitch = () => {
    const homeIds = homePitchPlayers.map(p => p.id);
    const awayIds = awayPitchPlayers.map(p => p.id);
    return [...homeIds, ...awayIds];
  };

  const handleAddTemporaryPlayer = useCallback((name: string): string => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const tempPlayer: Player = {
      id: tempId,
      name,
      default_team_id: null,
      isTemporary: true,
    };
    setAllPlayers((prev) => [...prev, tempPlayer]);
    return tempId;
  }, []);

  const removeGoal = (team: "home" | "away", index: number) => {
    if (team === "home") {
      setHomeGoals((prev) => prev.filter((_, i) => i !== index));
      setHomeScore((prev) => Math.max(0, prev - 1));
    } else {
      setAwayGoals((prev) => prev.filter((_, i) => i !== index));
      setAwayScore((prev) => Math.max(0, prev - 1));
    }
  };

  // Group goals by player, preserving first-appearance order, with counts
  const getGroupedGoals = (team: "home" | "away") => {
    const goals = team === "home" ? homeGoals : awayGoals;
    const order: string[] = [];
    const counts = new Map<string, number>();
    goals.forEach((playerId) => {
      if (!counts.has(playerId)) order.push(playerId);
      counts.set(playerId, (counts.get(playerId) || 0) + 1);
    });
    return order.map((playerId) => ({ playerId, count: counts.get(playerId) || 0 }));
  };

  const incrementGoal = (team: "home" | "away", playerId: string) => {
    if (team === "home") {
      const newGoals = [...homeGoals, playerId];
      setHomeGoals(newGoals);
      if (newGoals.length > homeScore) setHomeScore(newGoals.length);
    } else {
      const newGoals = [...awayGoals, playerId];
      setAwayGoals(newGoals);
      if (newGoals.length > awayScore) setAwayScore(newGoals.length);
    }
  };

  const decrementGoal = (team: "home" | "away", playerId: string) => {
    if (team === "home") {
      const lastIndex = homeGoals.lastIndexOf(playerId);
      if (lastIndex === -1) return;
      setHomeGoals((prev) => prev.filter((_, i) => i !== lastIndex));
      setHomeScore((prev) => Math.max(0, prev - 1));
    } else {
      const lastIndex = awayGoals.lastIndexOf(playerId);
      if (lastIndex === -1) return;
      setAwayGoals((prev) => prev.filter((_, i) => i !== lastIndex));
      setAwayScore((prev) => Math.max(0, prev - 1));
    }
  };

  const removeAllGoalsForPlayer = (team: "home" | "away", playerId: string) => {
    if (team === "home") {
      const removed = homeGoals.filter((id) => id === playerId).length;
      setHomeGoals((prev) => prev.filter((id) => id !== playerId));
      setHomeScore((prev) => Math.max(0, prev - removed));
    } else {
      const removed = awayGoals.filter((id) => id === playerId).length;
      setAwayGoals((prev) => prev.filter((id) => id !== playerId));
      setAwayScore((prev) => Math.max(0, prev - removed));
    }
  };


  const adjustScore = (team: "home" | "away", delta: number) => {
    if (team === "home") {
      const newScore = Math.max(0, homeScore + delta);
      setHomeScore(newScore);
      // If decreasing and there are more goals than score, remove last goal
      if (delta < 0 && homeGoals.length > newScore) {
        setHomeGoals((prev) => prev.slice(0, newScore));
      }
    } else {
      const newScore = Math.max(0, awayScore + delta);
      setAwayScore(newScore);
      if (delta < 0 && awayGoals.length > newScore) {
        setAwayGoals((prev) => prev.slice(0, newScore));
      }
    }
  };

  const getPlayerName = (playerId: string) => {
    const player = allPlayers.find((p) => p.id === playerId);
    return player?.name || "Player";
  };

  // Check if a goal is an own goal (player from opposite team)
  const isOwnGoal = (playerId: string, scoringForTeam: "home" | "away") => {
    const opposingTeamId = scoringForTeam === "home" ? awayTeamId : homeTeamId;
    
    // First, check if player is assigned to a team on the pitch for THIS match
    const isOnHomePitch = homePitchPlayers.some(p => p.id === playerId);
    const isOnAwayPitch = awayPitchPlayers.some(p => p.id === playerId);
    
    if (isOnHomePitch || isOnAwayPitch) {
      // Player is on the pitch - use their match assignment
      const playerMatchTeamId = isOnHomePitch ? homeTeamId : awayTeamId;
      return playerMatchTeamId === opposingTeamId;
    }
    
    // Fall back to default team if player is not on pitch
    const player = allPlayers.find((p) => p.id === playerId);
    if (!player || !player.default_team_id) return false;
    
    return player.default_team_id === opposingTeamId;
  };

  const homeTeam = teams.find((t) => t.id === homeTeamId);
  const awayTeam = teams.find((t) => t.id === awayTeamId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[95vh] p-0 gap-0 rounded-2xl">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="font-display text-xl text-center">
              {editMatch ? t("editResult") : t("addAResult")}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(95vh-80px)]">
            {editMatch && isLoadingEditData ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading match data...</p>
              </div>
            ) : (
            <div className="px-4 pb-4 space-y-4">
              {/* Team selectors with scores */}
              <div className="space-y-3">
                {/* Home team */}
                <div className="flex items-center gap-3">
                  <Select value={homeTeamId} onValueChange={setHomeTeamId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Home team" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1 bg-muted rounded-lg px-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => adjustScore("home", -1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-xl font-bold w-8 text-center">{homeScore}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => adjustScore("home", 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Away team */}
                <div className="flex items-center gap-3">
                  <Select value={awayTeamId} onValueChange={setAwayTeamId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Away team" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1 bg-muted rounded-lg px-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => adjustScore("away", -1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-xl font-bold w-8 text-center">{awayScore}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => adjustScore("away", 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Football pitch */}
              <FootballPitch
                homeTeamName={homeTeam?.name || "Home"}
                awayTeamName={awayTeam?.name || "Away"}
                homePlayers={homePitchPlayers}
                awayPlayers={awayPitchPlayers}
                allPlayers={allPlayers}
                onAddPlayer={(team, posIndex) => handleOpenPlayerModal(team, posIndex, false)}
                onRemovePlayer={handleRemoveFromPitch}
                onChangePlayer={handleChangePlayerOnPitch}
              />

              {/* Goal scorers section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Goal Scorers</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Home goals */}
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground text-center mb-2">
                      {homeTeam?.name || "Home"}
                    </div>
                    {getGroupedGoals("home").map(({ playerId, count }) => {
                      const ownGoal = isOwnGoal(playerId, "home");
                      return (
                        <div
                          key={`home-${playerId}`}
                          className={cn(
                            "flex items-center gap-2 rounded-full px-3 py-1.5 min-w-0",
                            ownGoal 
                              ? "bg-destructive/20 border-2 border-destructive/50" 
                              : "bg-muted"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full items-center justify-center shrink-0 hidden sm:flex",
                            ownGoal ? "bg-destructive" : "bg-team-home"
                          )}>
                            <User className="w-3 h-3 text-white" />
                          </div>
                          <span className={cn(
                            "text-sm flex-1 min-w-0 truncate",
                            ownGoal && "text-destructive font-medium"
                          )}>
                            {getPlayerName(playerId)}
                            {ownGoal && <span className="ml-1 text-xs">(OG)</span>}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => decrementGoal("home", playerId)}
                              className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-muted-foreground hover:text-foreground"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-bold w-4 text-center">{count}</span>
                            <button
                              type="button"
                              onClick={() => incrementGoal("home", playerId)}
                              className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-muted-foreground hover:text-foreground"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeAllGoalsForPlayer("home", playerId)}
                              className="text-muted-foreground hover:text-destructive ml-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1 text-xs"
                      onClick={() => handleOpenPlayerModal("home", 0, true)}
                    >
                      <Plus className="w-3 h-3" />
                      Add scorer
                    </Button>
                  </div>

                  {/* Away goals */}
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground text-center mb-2">
                      {awayTeam?.name || "Away"}
                    </div>
                    {getGroupedGoals("away").map(({ playerId, count }) => {
                      const ownGoal = isOwnGoal(playerId, "away");
                      return (
                        <div
                          key={`away-${playerId}`}
                          className={cn(
                            "flex items-center gap-2 rounded-full px-3 py-1.5 min-w-0",
                            ownGoal 
                              ? "bg-destructive/20 border-2 border-destructive/50" 
                              : "bg-muted"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full items-center justify-center shrink-0 hidden sm:flex",
                            ownGoal ? "bg-destructive" : "bg-team-away"
                          )}>
                            <User className="w-3 h-3 text-white" />
                          </div>
                          <span className={cn(
                            "text-sm flex-1 min-w-0 truncate",
                            ownGoal && "text-destructive font-medium"
                          )}>
                            {getPlayerName(playerId)}
                            {ownGoal && <span className="ml-1 text-xs">(OG)</span>}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => decrementGoal("away", playerId)}
                              className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-muted-foreground hover:text-foreground"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-bold w-4 text-center">{count}</span>
                            <button
                              type="button"
                              onClick={() => incrementGoal("away", playerId)}
                              className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-muted-foreground hover:text-foreground"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeAllGoalsForPlayer("away", playerId)}
                              className="text-muted-foreground hover:text-destructive ml-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1 text-xs"
                      onClick={() => handleOpenPlayerModal("away", 0, true)}
                    >
                      <Plus className="w-3 h-3" />
                      Add scorer
                    </Button>
                  </div>
                </div>
              </div>

              {/* Date picker */}
              <div className="space-y-2">
                <Label>Match Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !matchDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {matchDate ? format(matchDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={matchDate}
                      onSelect={(date) => date && setMatchDate(date)}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Save button */}
              <Button onClick={handleSave} className="w-full" size="lg">
                {editMatch ? "Save Changes" : "Save result"}
              </Button>
            </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <PlayerSelectModal
        open={playerModalOpen}
        onOpenChange={setPlayerModalOpen}
        teams={teams}
        players={allPlayers}
        selectedTeamId={selectingForTeam === "home" ? homeTeamId : awayTeamId}
        onSelectPlayer={handlePlayerSelected}
        onAddTemporaryPlayer={handleAddTemporaryPlayer}
        excludePlayerIds={selectingForGoal ? [] : getPlayersOnPitch()}
        pitchPlayerAssignments={selectingForGoal ? [
          ...homePitchPlayers.map(p => ({ playerId: p.id, teamId: homeTeamId })),
          ...awayPitchPlayers.map(p => ({ playerId: p.id, teamId: awayTeamId }))
        ] : undefined}
      />
    </>
  );
};

export default AddResultDialog;
