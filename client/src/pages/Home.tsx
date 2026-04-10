import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Package2, Truck } from "lucide-react";
import AdminDashboard from "./AdminDashboard";
import DriverPanel from "./DriverPanel";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"admin" | "driver" | "home">("home");

  if (activeTab === "admin") {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="outline"
              onClick={() => setActiveTab("home")}
              className="gap-2"
            >
              ← Back
            </Button>
          </div>
        </div>
        <AdminDashboard />
      </div>
    );
  }

  if (activeTab === "driver") {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="outline"
              onClick={() => setActiveTab("home")}
              className="gap-2"
            >
              ← Back
            </Button>
          </div>
        </div>
        <DriverPanel />
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
              <Button
                className="w-full"
                size="lg"
                onClick={() => setActiveTab("admin")}
              >
                Open Admin Dashboard
              </Button>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 hover:border-accent/50 transition-colors">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Truck className="w-5 h-5 text-accent" />
                Delivery Driver
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                View assigned orders and update delivery status in real-time.
              </p>
              <Button
                className="w-full"
                size="lg"
                onClick={() => setActiveTab("driver")}
              >
                Open Driver Panel
              </Button>
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
