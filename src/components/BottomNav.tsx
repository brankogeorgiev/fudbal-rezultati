import { Link, useLocation, useParams } from "react-router-dom";
import { Trophy, Users, BarChart3, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { TranslationKey } from "@/i18n/translations";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  suffix: string;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { suffix: "", labelKey: "results", icon: Trophy },
  { suffix: "/players", labelKey: "players", icon: Users },
  { suffix: "/statistics", labelKey: "stats", icon: BarChart3 },
  { suffix: "/exports", labelKey: "exports", icon: Download, adminOnly: true },
];

const BottomNav = () => {
  const location = useLocation();
  const { seasonName: seasonId } = useParams<{ seasonName: string }>();
  const { t } = useLanguage();
  const { isAdmin } = useAuth();

  if (!seasonId) return null;

  const base = `/season/${encodeURIComponent(seasonId ?? "")}`;
  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/50 z-50 bottom-nav">
      <div className="w-full max-w-lg mx-auto px-4">
        <div className="flex items-center justify-around py-2">
          {visibleItems.map((item) => {
            const to = `${base}${item.suffix}`;
            const isActive = location.pathname === to;
            const Icon = item.icon;
            return (
              <Link
                key={item.suffix}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
