import { Navigate } from "react-router-dom";
import { useSeasons } from "@/hooks/useSeasons";
import { Skeleton } from "@/components/ui/skeleton";

const HomeRedirect = () => {
  const { data: seasons, isLoading } = useSeasons();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!seasons || seasons.length === 0) {
    return <Navigate to="/seasons" replace />;
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const active =
    seasons.find((s) => todayIso >= s.start_date && todayIso <= s.end_date) ??
    [...seasons].sort((a, b) => b.start_date.localeCompare(a.start_date))[0];

  return <Navigate to={`/s/${active.id}`} replace />;
};

export default HomeRedirect;
