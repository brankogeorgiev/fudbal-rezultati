import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import SeasonDialog from "@/components/SeasonDialog";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  useSeasons,
  useCreateSeason,
  useUpdateSeason,
  useDeleteSeason,
  type Season,
} from "@/hooks/useSeasons";

const AdminSeasons = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isAdmin, loading: authLoading } = useAuth();
  const { data: seasons, isLoading } = useSeasons();
  const createSeason = useCreateSeason();
  const updateSeason = useUpdateSeason();
  const deleteSeason = useDeleteSeason();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSeason, setEditSeason] = useState<Season | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const latestYear = seasons?.length
    ? Math.max(...seasons.map((s) => parseISO(s.start_date).getFullYear()))
    : null;
  const nextSeasonYear = latestYear ? latestYear + 1 : new Date().getFullYear();


  useEffect(() => {
    if (!authLoading && !isAdmin) navigate("/");
  }, [authLoading, isAdmin, navigate]);

  const handleSave = (data: { name: string; startDate: string; endDate: string }) => {
    if (editSeason) {
      updateSeason.mutate({ id: editSeason.id, ...data });
    } else {
      createSeason.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <Header />
      <main className="container max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t("back")}
          </Button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display font-bold text-xl">{t("manageSeasons")}</h1>
          <Button
            size="sm"
            onClick={() => {
              setEditSeason(null);
              setDialogOpen(true);
            }}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            {t("newSeason")}
          </Button>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))
          ) : seasons && seasons.length > 0 ? (
            seasons.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-foreground">{s.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(s.start_date), "MMM d, yyyy")} —{" "}
                      {format(parseISO(s.end_date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditSeason(s);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setDeleteId(s.id);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-12">{t("noSeasonsYet")}</p>
          )}
        </div>
      </main>

      <SeasonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editSeason={editSeason}
        defaultYear={nextSeasonYear}
        onSave={handleSave}
      />


      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          if (deleteId) deleteSeason.mutate(deleteId);
          setDeleteId(null);
        }}
        title={t("deleteSeason")}
        description={t("deleteSeasonDescription")}
      />
    </div>
  );
};

export default AdminSeasons;
