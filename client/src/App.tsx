import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import DriverPanel from "./pages/DriverPanel";
import DriverDashboard from "./pages/DriverDashboard";
import KitchenDashboard from "./components/admin/KitchenDashboard";
import KitchenLogin from "./pages/KitchenLogin";
import NotFound from "./pages/NotFound";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

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

  if (requiredRole && user.role !== requiredRole) {
    return <NotFound />;
  }

  return <Component />;
}

function SystemProtectedRoute({ component: Component, requiredRole }: { component: any; requiredRole: "admin" | "kitchen" }) {
  // Check system session from localStorage
  const systemSessionToken = localStorage.getItem("systemSessionToken");
  const systemRole = localStorage.getItem("systemRole");

  if (!systemSessionToken || !systemRole) {
    return requiredRole === "admin" ? <AdminLogin /> : <KitchenLogin />;
  }

  if (systemRole !== requiredRole) {
    return <NotFound />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/kitchen-login" component={KitchenLogin} />
      <Route path="/driver-dashboard" component={DriverDashboard} />
      <Route path="/admin/*" component={() => <SystemProtectedRoute component={AdminDashboard} requiredRole="admin" />} />
      <Route path="/driver/*" component={DriverPanel} />
      <Route path="/kitchen" component={() => <SystemProtectedRoute component={KitchenDashboard} requiredRole="kitchen" />} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
