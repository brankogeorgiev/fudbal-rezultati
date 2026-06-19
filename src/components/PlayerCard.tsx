import { Pencil, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PlayerCardProps {
  id: string;
  name: string;
  defaultTeamName?: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen?: (id: string) => void;
  showActions?: boolean;
}

const PlayerCard = ({ id, name, defaultTeamName, onEdit, onDelete, onOpen, showActions = true }: PlayerCardProps) => {
  return (
    <div
      className="result-card animate-fade-in cursor-pointer"
      onClick={() => onOpen?.(id)}
      role={onOpen ? "button" : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{name}</span>
            {defaultTeamName && (
              <Badge variant="secondary" className="text-xs w-fit mt-1">
                {defaultTeamName}
              </Badge>
            )}
          </div>
        </div>

        {showActions && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(id); }}
              className="icon-button-edit"
              aria-label="Edit player"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(id); }}
              className="icon-button-delete"
              aria-label="Delete player"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerCard;
