import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileSpreadsheet, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrentSeason } from "@/hooks/useSeasons";

interface ExportFile {
  name: string;
  created_at: string;
}

const Exports = () => {
  const [files, setFiles] = useState<ExportFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const { t } = useLanguage();
  const { data: season } = useCurrentSeason();

  const seasonSlug = season
    ? season.name.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 40)
    : null;

  const fetchExports = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from("data-exports")
      .list("", { sortBy: { column: "created_at", order: "desc" } });

    if (error) {
      toast.error(t("failedToLoadExports"));
      console.error(error);
    } else {
      // Filter to files belonging to this season (prefix `data-export-<slug>-`)
      const all = data || [];
      const filtered = seasonSlug
        ? all.filter((f) => f.name.startsWith(`data-export-${seasonSlug}-`))
        : all;
      setFiles(filtered);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonSlug]);

  const handleGenerateExport = async () => {
    if (!season) return;
    setGenerating(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const todayFilename = `data-export-${seasonSlug}-${today}.xlsx`;

      const existingFile = files.find((f) => f.name === todayFilename);

      const { data, error } = await supabase.functions.invoke("export-data", {
        body: {
          startDate: season.start_date,
          endDate: season.end_date,
          seasonName: season.name,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(existingFile ? t("exportRefreshed") : t("exportCreated"));
        await fetchExports();
      } else {
        throw new Error(data.error || "Export failed");
      }
    } catch (error) {
      console.error(error);
      toast.error(t("failedToGenerateExport"));
    }
    setGenerating(false);
  };

  const handleDownload = async (filename: string) => {
    setDownloading(filename);
    try {
      const { data, error } = await supabase.storage
        .from("data-exports")
        .createSignedUrl(filename, 60);

      if (error) throw error;

      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(t("downloadStarted"));
    } catch (error) {
      console.error(error);
      toast.error(t("failedToDownload"));
    }
    setDownloading(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t("exports")}</h1>
          <Button onClick={handleGenerateExport} disabled={generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {t("newExport")}
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            {t("loadingExports")}
          </div>
        ) : files.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t("noExportsAvailable")}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <Card key={file.name}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(file.created_at), "PPP 'at' p")}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(file.name)}
                    disabled={downloading === file.name}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloading === file.name ? t("downloading") : t("download")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Exports;
