import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNavbar } from "@/components/layout/top-navbar";
import { useAuthStore } from "@/lib/auth-store";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import UserGuidePage from "@/pages/user-guide";
import DashboardPage from "@/pages/dashboard";
import SocialPage from "@/pages/social";
import EmailPage from "@/pages/email";
import EventsPage from "@/pages/events";
import TasksPage from "@/pages/tasks";
import AssetsPage from "@/pages/assets";
import SettingsPage from "@/pages/settings";
import BrandsPage from "@/pages/brands";
import BrandDetailPage from "@/pages/brand-detail";
import SentContentPage from "@/pages/sent";
import ProjectsPage from "@/pages/projects";
import PublishingQueuePage from "@/pages/publishing-queue";
import PublishPage from "@/pages/publish";
import PublishedPage from "@/pages/published";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}

function Router() {
  const { isAuthenticated } = useAuthStore();
  const [location] = useLocation();

  if (location === "/login") {
    if (isAuthenticated) {
      return <Redirect to="/" />;
    }
    return <LoginPage />;
  }

  if (location === "/user-guide") {
    return <UserGuidePage />;
  }

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/social" component={SocialPage} />
          <Route path="/email" component={EmailPage} />
          <Route path="/events" component={EventsPage} />
          <Route path="/tasks" component={TasksPage} />
          <Route path="/assets" component={AssetsPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/brands" component={BrandsPage} />
          <Route path="/brands/:id" component={BrandDetailPage} />
          <Route path="/sent" component={SentContentPage} />
          <Route path="/projects" component={ProjectsPage} />
          <Route path="/publishing-queue" component={PublishingQueuePage} />
          <Route path="/publish/:id" component={PublishPage} />
          <Route path="/published" component={PublishedPage} />
          <Route component={NotFound} />
        </Switch>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
