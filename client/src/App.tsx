import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { Skeleton } from "@/components/ui/skeleton";

import AuthPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import TeamsPage from "@/pages/teams";
import CompetitionsPage from "@/pages/competitions";
import PracticePage from "@/pages/practice";
import PaymentsPage from "@/pages/payments";
import MatchPage from "@/pages/match";
import AdminPage from "@/pages/admin";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="space-y-4 text-center">
        <Skeleton className="h-12 w-12 rounded-md mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}

function ProtectedRoutes() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/teams" component={TeamsPage} />
              <Route path="/teams/:id" component={TeamsPage} />
              <Route path="/competitions" component={CompetitionsPage} />
              <Route path="/competitions/:id" component={CompetitionsPage} />
              <Route path="/practice" component={PracticePage} />
              <Route path="/payments" component={PaymentsPage} />
              <Route path="/match/:id" component={MatchPage} />
              <Route path="/admin" component={AdminPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    if (location !== "/" && location !== "/auth") {
      setLocation("/");
    }
    return <AuthPage />;
  }

  if (location === "/" || location === "/auth") {
    setLocation("/dashboard");
    return <LoadingScreen />;
  }

  return <ProtectedRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <AppRouter />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
