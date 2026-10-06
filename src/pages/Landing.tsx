import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trophy, Plus, Settings, CalendarRange, Pencil, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SeasonDialog from "@/components/SeasonDialog";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  useSeasons,
  useSeasonMatchCounts,
  useCreateSeason,
  useUpdateSeason,
  useDeleteSeason,
  type Season,
} from "@/hooks/useSeasons";

const Landing = () => {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: seasons, isLoading } = useSeasons();
  const { data: counts } = useSeasonMatchCounts();
  const createSeason = useCreateSeason();
  const updateSeason = useUpdateSeason();
  const deleteSeason = useDeleteSeason();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Season | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Season | null>(null);

  const todayIso = new Date().toISOString().slice(0, 10);

  const latestYear = seasons?.length
    ? Math.max(...seasons.map((s) => parseISO(s.start_date).getFullYear()))
    : null;
  const nextSeasonYear = latestYear ? latestYear + 1 : new Date().getFullYear();


  const handleSave = (data: { name: string; startDate: string; endDate: string }) => {
    if (editTarget) {
      updateSeason.mutate({ id: editTarget.id, ...data });
    } else {
      createSeason.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <Header />
      <main className="container max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground">
              {t("chooseSeason")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("chooseSeasonSubtitle")}
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setEditTarget(null);
                  setDialogOpen(true);
                }}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                {t("newSeason")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin/seasons")}
                className="gap-1"
              >
                <Settings className="w-4 h-4" />
                {t("manageSeasons")}
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : seasons && seasons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {seasons.map((s) => {
              const isCurrent = todayIso >= s.start_date && todayIso <= s.end_date;
              const matchCount = counts?.[s.id] ?? 0;
              return (
                <div key={s.id} className="relative group">
                  <Link to={`/season/${encodeURIComponent(s.name)}`} className="block">
                    <Card className="h-full transition-all group-hover:border-primary/60 group-hover:shadow-md">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-primary" />
                          </div>
                          {isCurrent && (
                            <Badge className="bg-primary text-primary-foreground">
                              {t("current")}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-display font-bold text-lg text-foreground">
                          {s.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                          <CalendarRange className="w-3.5 h-3.5" />
                          <span>
                            {format(parseISO(s.start_date), "MMM d, yyyy")} —{" "}
                            {format(parseISO(s.end_date), "MMM d, yyyy")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-3">
                          {matchCount} {t("matches")}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                  {isAdmin && (
                    <div className="absolute bottom-3 right-3 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={t("editSeason")}
                        onClick={() => {
                          setEditTarget(s);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={t("deleteSeason")}
                        onClick={() => setDeleteTarget(s)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">{t("noSeasonsYet")}</p>
            {isAdmin && (
              <Button
                onClick={() => {
                  setEditTarget(null);
                  setDialogOpen(true);
                }}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("createFirstSeason")}
              </Button>
            )}
          </div>
        )}
      </main>

      <SeasonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editSeason={editTarget}
        defaultYear={nextSeasonYear}
        onSave={handleSave}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteSeason.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title={t("deleteSeason")}
        description={t("deleteSeasonDescription")}
      />
    </div>
  );
};

export default Landing;
