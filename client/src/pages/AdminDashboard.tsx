import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useMobile";
import { DeveloperCredit } from "@/components/DeveloperCredit";

import { Menu, Package2, Truck, LogOut, Settings, Plus, Map, X, Calendar, Gift } from "lucide-react";
import MenuManagement from "@/components/admin/MenuManagement";
import { Orders } from "@/pages/Orders";
import DriverManagement from "@/components/admin/DriverManagement";
import Dashboard from "@/components/admin/Dashboard";
import CreateOrder from "@/components/admin/CreateOrder";
import OrderTrackingWithMap from "@/components/admin/OrderTrackingWithMap";
import { DeliveryReportTab } from "@/components/DeliveryReportTab";
import ReservationManagement from "@/components/admin/ReservationManagement";


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
  const isDesktop = width >= 1024;
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Developer Credit */}
      <DeveloperCredit />
      
      {/* Mobile Header - Always visible on        {/* Mobile Header with Menu Toggle */}
        {isMobile && (
          <header className="border-b border-border/40 backdrop-blur-sm bg-white/95 shadow-sm px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img 
                src="/barrel-logo.png" 
                alt="The Barrel Restaurant (Pizza & Pasta)" 
                className="h-8 w-auto object-contain"
              />
              <div className="flex flex-col min-w-0">
                <h1 className="text-sm font-bold text-foreground truncate">Barrel Delivery</h1>
                <p className="text-xs text-muted-foreground truncate">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs h-8"
                onClick={() => logout()}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden xs:inline">Logout</span>
              </Button>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-accent rounded-md transition-colors"
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </header>
        )}
      {/* Main Layout Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Mobile: Fixed overlay, Desktop: Static */}
        {isMobile ? (
          <>
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-40 top-[3.5rem]"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            {/* Mobile Sidebar */}
            <aside
              className={`
                fixed left-0 top-[3.5rem] h-[calc(100vh-3.5rem)] w-64 z-50
                border-r border-border bg-card transition-transform duration-300 flex flex-col
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
                shadow-lg
              `}
            >
              <SidebarContent currentTab={currentTab} logout={logout} />
            </aside>
          </>
        ) : (
          <>
            {/* Tablet/Desktop Sidebar */}
            <aside
              className={`
                ${isTablet ? "w-56" : "w-64"}
                border-r border-border bg-card flex flex-col flex-shrink-0
              `}
            >
              {/* Desktop Header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <img 
                  src="/barrel-logo.png" 
                  alt="The Barrel Restaurant (Pizza & Pasta)" 
                  className="h-8 w-auto object-contain"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-foreground text-sm truncate">
                    Barrel Delivery
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">Admin</p>
                </div>
              </div>
              <SidebarContent currentTab={currentTab} logout={logout} />
            </aside>
          </>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Desktop Header */}
          {!isMobile && (
            <header className="border-b border-border/40 backdrop-blur-sm bg-white/95 shadow-sm px-4 md:px-6 py-3 md:py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <img 
                  src="/barrel-logo.png" 
                  alt="The Barrel Restaurant (Pizza & Pasta)" 
                  className="h-10 w-auto object-contain"
                />
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-foreground">
                    Admin Dashboard
                  </h1>
                  <p className="text-xs text-muted-foreground">The Barrel Restaurant</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="gap-2 text-sm h-9"
                onClick={() => logout()}
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </header>
          )}

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-auto">
            <div className="w-full h-full p-4 md:p-6">
              <div className="w-full max-w-7xl mx-auto">
                {currentTab === "dashboard" && <Dashboard />}
                {currentTab === "create-order" && <CreateOrder />}
                {currentTab === "menu" && <MenuManagement />}
                {currentTab === "orders" && <Orders />}
                {currentTab === "drivers" && <DriverManagement />}
                {currentTab === "order-tracking" && <OrderTrackingWithMap />}
                {currentTab === "delivery-report" && <DeliveryReportTab />}
                {currentTab === "reservations" && <ReservationManagement />}

              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  currentTab,
  logout,
}: {
  currentTab: string;
  logout: () => void;
}) {
  return (
    <>
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
        <NavItem
          href="/admin/delivery-report"
          icon={<Calendar className="w-5 h-5" />}
          label="Delivery Report"
          active={currentTab === "delivery-report"}
        />
        <NavItem
          href="/admin/reservations"
          icon={<Gift className="w-5 h-5" />}
          label="Reservations"
          active={currentTab === "reservations"}
        />

      </nav>

      {/* Footer */}
      {/* Logout button moved to top right header on desktop */}
    </>
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
    <a href={href} className="block" onClick={(e) => {
      // Let wouter handle the navigation
      e.preventDefault();
      window.history.pushState({}, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }}>
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
