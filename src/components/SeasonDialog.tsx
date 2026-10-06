import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSeasons, type Season } from "@/hooks/useSeasons";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editSeason: Season | null;
  /** Year used to prefill Jan 1 – Dec 31 defaults for a new season. */
  defaultYear?: number;
  onSave: (data: { name: string; startDate: string; endDate: string }) => void;
}

const toIso = (d: Date) => format(d, "yyyy-MM-dd");

const SeasonDialog = ({ open, onOpenChange, editSeason, defaultYear, onSave }: Props) => {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  useEffect(() => {
    if (open) {
      if (editSeason) {
        setName(editSeason.name);
        setStartDate(new Date(editSeason.start_date));
        setEndDate(new Date(editSeason.end_date));
      } else {
        const year = defaultYear ?? new Date().getFullYear();
        setName(`Season ${year}`);
        setStartDate(new Date(year, 0, 1));
        setEndDate(new Date(year, 11, 31));
      }
    }
  }, [open, editSeason, defaultYear]);


  const { data: seasons } = useSeasons();

  const overlapSeason = (() => {
    if (!startDate || !endDate || !seasons) return null;
    const s = toIso(startDate);
    const e = toIso(endDate);
    return (
      seasons.find(
        (season) =>
          season.id !== editSeason?.id &&
          season.start_date <= e &&
          season.end_date >= s
      ) || null
    );
  })();

  const canSave =
    !!name.trim() && !!startDate && !!endDate && endDate >= startDate && !overlapSeason;

  const handleSave = () => {
    if (!canSave || !startDate || !endDate) return;
    onSave({ name: name.trim(), startDate: toIso(startDate), endDate: toIso(endDate) });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editSeason ? t("editSeason") : t("newSeason")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("seasonName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="2025/26"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("startDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : t("pickDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>{t("endDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : t("pickDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(d) => (startDate ? d < startDate : false)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {overlapSeason && (
            <p className="text-sm text-destructive">
              {t("seasonOverlap")}: {overlapSeason.name} (
              {format(new Date(overlapSeason.start_date), "PP")} –{" "}
              {format(new Date(overlapSeason.end_date), "PP")})
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SeasonDialog;
