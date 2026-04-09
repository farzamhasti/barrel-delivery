import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Package2, Truck, LogOut } from "lucide-react";

export default function Home() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-2xl shadow-lg p-8 border border-border">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Barrel Delivery</h1>
                  <p className="text-muted-foreground">Logged in as: {user.name || user.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logout()}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>

              {user.role === "admin" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-6">You have admin access. Navigate to the admin dashboard:</p>
                  <a href="/admin">
                    <Button className="w-full gap-3 h-14 text-lg" size="lg">
                      <Package2 className="w-6 h-6" />
                      Admin Dashboard
                    </Button>
                  </a>
                </div>
              )}

              {user.role === "driver" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-6">You have driver access. View your orders:</p>
                  <a href="/driver">
                    <Button className="w-full gap-3 h-14 text-lg" size="lg">
                      <Truck className="w-6 h-6" />
                      Driver Panel
                    </Button>
                  </a>
                </div>
              )}

              {user.role === "user" && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Your account role is not configured for this application.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted/30 flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Package2 className="w-6 h-6 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Barrel Delivery</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Restaurant Delivery Management</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Elegant platform for managing restaurant orders, drivers, and real-time delivery tracking.
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-6 hover:border-accent/50 transition-colors">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Package2 className="w-5 h-5 text-accent" />
                Restaurant Admin
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Manage menu, orders, drivers, and track deliveries in real-time.
              </p>
              <a href={getLoginUrl()}>
                <Button className="w-full" size="lg">
                  Login as Admin
                </Button>
              </a>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 hover:border-accent/50 transition-colors">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Truck className="w-5 h-5 text-accent" />
                Delivery Driver
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                View assigned orders and update delivery status in real-time.
              </p>
              <a href={getLoginUrl()}>
                <Button className="w-full" size="lg">
                  Login as Driver
                </Button>
              </a>
            </div>
          </div>

          {/* Features */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-6">Key Features</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-2">📋</div>
                <p className="text-xs text-muted-foreground">Menu Management</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🚗</div>
                <p className="text-xs text-muted-foreground">Driver Tracking</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🗺️</div>
                <p className="text-xs text-muted-foreground">Live Map View</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">📊</div>
                <p className="text-xs text-muted-foreground">Order Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 text-center text-sm text-muted-foreground">
        <p>&copy; 2024 Barrel Delivery. All rights reserved.</p>
      </footer>
    </div>
  );
}
