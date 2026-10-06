import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import Landing from "./pages/Landing";
import HomeRedirect from "./pages/HomeRedirect";
import Index from "./pages/Index";
import Players from "./pages/Players";
import Statistics from "./pages/Statistics";
import MatchDetails from "./pages/MatchDetails";
import PlayerDetails from "./pages/PlayerDetails";
import Exports from "./pages/Exports";
import AdminUsers from "./pages/AdminUsers";
import AdminSeasons from "./pages/AdminSeasons";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/seasons" element={<Landing />} />
            <Route path="/season/:seasonName" element={<Index />} />
            <Route path="/season/:seasonName/match/:id" element={<MatchDetails />} />
            <Route path="/season/:seasonName/players" element={<Players />} />
            <Route path="/season/:seasonName/player/:id" element={<PlayerDetails />} />
            <Route path="/season/:seasonName/statistics" element={<Statistics />} />
            <Route path="/season/:seasonName/exports" element={<Exports />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/seasons" element={<AdminSeasons />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
