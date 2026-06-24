import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Player {
  id: string;
  name: string;
}

interface PitchPlayer {
  id: string;
  positionIndex: number;
}

interface ViewOnlyPitchProps {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: PitchPlayer[];
  awayPlayers: PitchPlayer[];
  allPlayers: Player[];
}

// 6-a-side formation (1 GK + 2 DEF + 2 MID + 1 FWD) for each team
// Positions spread further apart to prevent overlapping
const HOME_POSITIONS = [
  { x: 50, y: 88, label: "GK" },
  { x: 25, y: 76, label: "DEF" },
  { x: 75, y: 76, label: "DEF" },
  { x: 25, y: 64, label: "MID" },
  { x: 75, y: 64, label: "MID" },
  { x: 50, y: 54, label: "FWD" },
];

const AWAY_POSITIONS = [
  { x: 50, y: 12, label: "GK" },
  { x: 25, y: 24, label: "DEF" },
  { x: 75, y: 24, label: "DEF" },
  { x: 25, y: 36, label: "MID" },
  { x: 75, y: 36, label: "MID" },
  { x: 50, y: 46, label: "FWD" },
];

const HOME_SUBS = [
  { x: 8, y: 70, label: "SUB" },
  { x: 8, y: 82, label: "SUB" },
];

const AWAY_SUBS = [
  { x: 92, y: 18, label: "SUB" },
  { x: 92, y: 30, label: "SUB" },
];

const ViewOnlyPitch = ({
  homeTeamName,
  awayTeamName,
  homePlayers,
  awayPlayers,
  allPlayers,
}: ViewOnlyPitchProps) => {
  const navigate = useNavigate();
  const getPlayerName = (playerId: string) => {
    const player = allPlayers.find((p) => p.id === playerId);
    return player?.name || "Player";
  };

  const getPlayerAtPosition = (team: "home" | "away", positionIndex: number) => {
    const players = team === "home" ? homePlayers : awayPlayers;
    return players.find((p) => p.positionIndex === positionIndex);
  };

  const renderPosition = (
    team: "home" | "away",
    position: { x: number; y: number; label: string },
    positionIndex: number
  ) => {
    const player = getPlayerAtPosition(team, positionIndex);
    const isHome = team === "home";
    const isGoalkeeper = positionIndex === 0;
    
    const bgColor = isGoalkeeper 
      ? (isHome ? "bg-team-home-gk" : "bg-team-away-gk")
      : (isHome ? "bg-team-home" : "bg-team-away");
    
    const textColor = isGoalkeeper 
      ? "text-white" 
      : (isHome ? "text-purple-600" : "text-white");

    const positionId = `${team}-${positionIndex}`;

    if (!player) return null;

    return (
      <div
        key={positionId}
        className="absolute transform -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
        }}
      >
        <button
          type="button"
          onClick={() => navigate(`/player/${player.id}`)}
          className="flex flex-col items-center cursor-pointer focus:outline-none"
        >
          <div
            className={`w-9 h-9 rounded-full ${bgColor} flex items-center justify-center shadow-lg border-2 transition-transform hover:scale-110`}
          >
            <User className={`w-5 h-5 ${textColor}`} />
          </div>
          <span className="text-[10px] text-white font-medium mt-0.5 bg-black/40 px-1.5 py-0.5 rounded whitespace-nowrap">
            {getPlayerName(player.id)}
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className="relative w-full aspect-[3/4] max-h-[400px] rounded-lg overflow-visible my-8">
      {/* Pitch background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(142,60%,45%)] to-[hsl(142,55%,35%)] rounded-lg">
        {/* Pitch markings */}
        <svg
          viewBox="0 0 100 130"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <rect x="5" y="5" width="90" height="120" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
          <line x1="5" y1="65" x2="95" y2="65" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
          <circle cx="50" cy="65" r="12" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
          <circle cx="50" cy="65" r="1" fill="rgba(255,255,255,0.4)" />
          <rect x="25" y="5" width="50" height="20" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
          <rect x="35" y="5" width="30" height="8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
          <rect x="25" y="105" width="50" height="20" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
          <rect x="35" y="117" width="30" height="8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Team labels - outside the pitch */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
        <span className="text-xs font-semibold text-foreground bg-card px-3 py-1 rounded-lg shadow-sm border border-border">
          {awayTeamName}
        </span>
      </div>
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-10">
        <span className="text-xs font-semibold text-foreground bg-card px-3 py-1 rounded-lg shadow-sm border border-border">
          {homeTeamName}
        </span>
      </div>

      {/* Players on pitch */}
      <div className="absolute inset-0">
        {HOME_POSITIONS.map((pos, index) => renderPosition("home", pos, index))}
        {AWAY_POSITIONS.map((pos, index) => renderPosition("away", pos, index))}
        {HOME_SUBS.map((pos, index) => renderPosition("home", pos, index + 6))}
        {AWAY_SUBS.map((pos, index) => renderPosition("away", pos, index + 6))}
      </div>
    </div>
  );
};

export default ViewOnlyPitch;
