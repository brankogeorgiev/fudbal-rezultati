import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Trophy, User, LogOut, Shield, Menu, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import AuthDialog from "@/components/AuthDialog";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSeason, useSeasons } from "@/hooks/useSeasons";
import { toast } from "sonner";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { seasonId } = useParams<{ seasonId: string }>();
  const { data: season } = useSeason(seasonId);
  const { data: seasons } = useSeasons();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAdmin, loading, signOut } = useAuth();
  const { t } = useLanguage();

  const handleSeasonChange = (newId: string) => {
    if (!newId || newId === seasonId) return;
    const match = location.pathname.match(/^\/s\/[^/]+(\/.*)?$/);
    const suffix = match?.[1] ?? "";
    navigate(`/s/${newId}${suffix}`);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("signedOutSuccessfully"));
    }
  };

  const seasonSelect =
    seasonId && seasons && seasons.length > 0 ? (
      <Select value={seasonId} onValueChange={handleSeasonChange}>
        <SelectTrigger
          className="h-9 w-full gap-1.5 border-border/60 bg-background/60 px-2.5 text-xs font-medium sm:w-auto"
          title={t("changeSeason")}
        >
          <SelectValue placeholder={season?.name ?? t("changeSeason")} />
        </SelectTrigger>
        <SelectContent align="end">
          {seasons.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null;

  return (
    <>
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <button
              className="flex items-center gap-3 cursor-pointer text-left"
              onClick={() => navigate("/")}
              title={t("home")}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg text-foreground">{t("football")}</h1>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {t("resultsSystem")}
                </p>
              </div>
            </button>

          {/* Mobile season label */}
          {seasonId && season && (
            <span className="sm:hidden text-xs text-muted-foreground uppercase tracking-wider truncate max-w-[120px]">
              {season.name}
            </span>
          )}

          {/* Desktop / tablet controls */}
          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/seasons")}
              title={t("chooseSeason")}
            >
              <LayoutGrid className="w-5 h-5" />
            </Button>
            {seasonSelect}
            <LanguageSwitcher />
            {!loading && (
              <>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/admin/users")}
                    title={t("adminPanel")}
                  >
                    <Shield className="w-5 h-5 text-primary" />
                  </Button>
                )}
                {user ? (
                  <Button variant="ghost" size="icon" onClick={handleSignOut} title={t("signOut")}>
                    <LogOut className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => setAuthOpen(true)} title={t("signIn")}>
                    <User className="w-5 h-5" />
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="sm:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t("menu")}>
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>{t("menu")}</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-3">
                  <Button
                    variant="outline"
                    className="justify-start gap-2"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/seasons");
                    }}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    {t("chooseSeason")}
                  </Button>
                  {seasonSelect}
                  <div className="flex items-center justify-between gap-2">
                    <LanguageSwitcher />
                  </div>
                  {!loading && (
                    <>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          className="justify-start gap-2"
                          onClick={() => {
                            setMenuOpen(false);
                            navigate("/admin/users");
                          }}
                        >
                          <Shield className="w-4 h-4 text-primary" />
                          {t("adminPanel")}
                        </Button>
                      )}
                      {user ? (
                        <Button
                          variant="outline"
                          className="justify-start gap-2"
                          onClick={() => {
                            setMenuOpen(false);
                            handleSignOut();
                          }}
                        >
                          <LogOut className="w-4 h-4" />
                          {t("signOut")}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="justify-start gap-2"
                          onClick={() => {
                            setMenuOpen(false);
                            setAuthOpen(true);
                          }}
                        >
                          <User className="w-4 h-4" />
                          {t("signIn")}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
};

export default Header;
