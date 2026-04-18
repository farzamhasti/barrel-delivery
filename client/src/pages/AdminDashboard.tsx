import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useMobile";

import { Menu, Package2, Truck, LogOut, Settings, Plus, Map, X } from "lucide-react";
import MenuManagement from "@/components/admin/MenuManagement";
import { Orders } from "@/pages/Orders";
import DriverManagement from "@/components/admin/DriverManagement";
import Dashboard from "@/components/admin/Dashboard";
import CreateOrder from "@/components/admin/CreateOrder";
import OrderTrackingWithMap from "@/components/admin/OrderTrackingWithMap";

// Helper hook to get window width
function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
}

export default function AdminDashboard() {
  // All hooks must be at the top level, in the same order every render
  const [, params] = useRoute("/admin/*");
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const width = useWindowWidth();
  
  const isTablet = width >= 768 && width < 1024;
  const currentTab = (params as any)?.["*"] || "dashboard";

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [currentTab, isMobile]);

  // Default sidebar state based on screen size
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile/Tablet Header */}
      {(isMobile || isTablet) && (
        <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between md:hidden sticky top-0 z-40">
          <h1 className="text-lg font-bold text-foreground truncate flex-1">
            Barrel Delivery
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-2"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </header>
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isMobile ? "fixed inset-0 top-[3.5rem] z-50 w-64" : ""}
          ${isTablet ? "w-56" : ""}
          ${!isMobile && !isTablet ? "w-64" : ""}
          border-r border-border bg-card transition-all duration-300 flex flex-col
          ${isMobile && !sidebarOpen ? "translate-x-[-100%]" : "translate-x-0"}
          ${isMobile ? "shadow-lg" : ""}
        `}
      >
        {/* Desktop Header */}
        <div className="p-4 border-b border-border flex items-center justify-between hidden md:flex">
          <h2 className="font-bold text-foreground text-sm lg:text-base">
            Barrel Delivery
          </h2>
          {isTablet && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="ml-auto"
            >
              <Menu className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavItem
            href="/admin/dashboard"
            icon={<Package2 className="w-5 h-5" />}
            label="Dashboard"
            active={currentTab === "dashboard"}
          />
          <NavItem
            href="/admin/create-order"
            icon={<Plus className="w-5 h-5" />}
            label="New Order"
            active={currentTab === "create-order"}
          />
          <NavItem
            href="/admin/menu"
            icon={<Settings className="w-5 h-5" />}
            label="Menu"
            active={currentTab === "menu"}
          />
          <NavItem
            href="/admin/orders"
            icon={<Package2 className="w-5 h-5" />}
            label="Orders"
            active={currentTab === "orders"}
          />
          <NavItem
            href="/admin/drivers"
            icon={<Truck className="w-5 h-5" />}
            label="Drivers"
            active={currentTab === "drivers"}
          />
          <NavItem
            href="/admin/order-tracking"
            icon={<Map className="w-5 h-5" />}
            label="Order Tracking"
            active={currentTab === "order-tracking"}
          />
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <Button
            variant="outline"
            className="w-full gap-2 justify-center text-sm h-9"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 top-[3.5rem]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Header */}
        <header className="border-b border-border bg-card px-4 md:px-6 py-3 md:py-4 flex items-center justify-between hidden md:flex sticky top-0 z-30">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            Admin Dashboard
          </h1>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-6 w-full">
          <div className="w-full max-w-7xl mx-auto">
            {currentTab === "dashboard" && <Dashboard />}
            {currentTab === "create-order" && <CreateOrder />}
            {currentTab === "menu" && <MenuManagement />}
            {currentTab === "orders" && <Orders />}
            {currentTab === "drivers" && <DriverManagement />}
            {currentTab === "order-tracking" && <OrderTrackingWithMap />}
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <a href={href} className="block">
      <Button
        variant={active ? "default" : "ghost"}
        className="w-full justify-start gap-3 text-sm h-9"
      >
        {icon}
        <span className="truncate">{label}</span>
      </Button>
    </a>
  );
}
