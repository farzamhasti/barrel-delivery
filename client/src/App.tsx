import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DriverReturnTimeProvider } from "./contexts/DriverReturnTimeContext";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import DriverPanel from "./pages/DriverPanel";
import DriverDashboard from "./pages/DriverDashboard";
import DriverLogin from "./pages/DriverLogin";
import KitchenDashboardPage from "./pages/KitchenDashboardPage";
import KitchenLogin from "./pages/KitchenLogin";
import NotFound from "./pages/NotFound";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { trpc } from "./lib/trpc";

function ProtectedRoute({ component: Component, requiredRole }: { component: any; requiredRole?: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return <Home />;
  }

  if (requiredRole && (user as any)?.role !== requiredRole) {
    return <NotFound />;
  }

  return <Component />;
}

function SystemProtectedRoute({ component: Component, requiredRole }: { component: any; requiredRole: "admin" | "kitchen" }) {
  // Check if user has a valid system session token stored locally
  const sessionToken = localStorage.getItem('systemSessionToken');
  const storedRole = localStorage.getItem('systemRole');
  
  // If no session token, show login page
  if (!sessionToken || !storedRole) {
    return requiredRole === "admin" ? <AdminLogin /> : <KitchenLogin />;
  }
  
  // If role doesn't match, show not found
  if (storedRole !== requiredRole) {
    return <NotFound />;
  }
  
  // User has valid session, render the component
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/kitchen-login" component={KitchenLogin} />
      <Route path="/driver-login" component={DriverLogin} />
      <Route path="/driver-dashboard" component={DriverDashboard} />
      <Route path="/admin/*" component={() => <SystemProtectedRoute component={AdminDashboard} requiredRole="admin" />} />
      <Route path="/driver/*" component={DriverPanel} />
      <Route path="/kitchen" component={() => <SystemProtectedRoute component={KitchenDashboardPage} requiredRole="kitchen" />} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <DriverReturnTimeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </DriverReturnTimeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
