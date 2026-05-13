import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useMobile";
import { DeveloperCredit } from "@/components/DeveloperCredit";
import { Menu, LogOut, X, ArrowLeft } from "lucide-react";
import { NotificationIcon } from "@/components/NotificationIcon";
import { GeomarketingAnalyticsTab } from "@/components/GeomarketingAnalyticsTab";
import { LiveDriverTrackingWindow } from "@/components/LiveDriverTrackingWindow";
import { useLiveTracking } from "@/contexts/LiveTrackingContext";

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

export default function GeomarketingDashboard() {
  const [, params] = useRoute("/geomarketing/*");
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { isVisible, setIsVisible, windowState, setWindowState } = useLiveTracking();
  const width = useWindowWidth();
  
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  
  // Redirect to main geomarketing page if accessing /geomarketing or /geomarketing/
  useEffect(() => {
    if (location === "/geomarketing" || location === "/geomarketing/") {
      setLocation("/geomarketing/analytics");
    }
  }, [location, setLocation]);

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Default sidebar state based on screen size
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);
  
  // If redirecting, don't render content yet
  if (location === "/geomarketing" || location === "/geomarketing/") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Developer Credit */}
      <DeveloperCredit />
      
      {/* Mobile Header with Menu Toggle */}
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
              <p className="text-xs text-muted-foreground truncate">Geomarketing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationIcon role="admin" />
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
              <SidebarContent logout={logout} />
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
                  <p className="text-xs text-muted-foreground truncate">Geomarketing</p>
                </div>
              </div>
              <SidebarContent logout={logout} />
            </aside>
          </>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Desktop Header */}
          {!isMobile && (
            <header className="border-b border-border/40 backdrop-blur-sm bg-white/95 shadow-sm px-4 md:px-6 py-3 md:py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-6 flex-1">
                <div className="flex items-center gap-3">
                  <img 
                    src="/barrel-logo.png" 
                    alt="The Barrel Restaurant (Pizza & Pasta)" 
                    className="h-10 w-auto object-contain"
                  />
                  <div>
                    <h1 className="text-lg md:text-xl font-bold text-foreground">
                      Geomarketing Dashboard
                    </h1>
                    <p className="text-xs text-muted-foreground">The Barrel Restaurant</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <NotificationIcon role="admin" />
                <Button
                  variant="outline"
                  className="gap-2 text-sm h-9"
                  onClick={() => logout()}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </header>
          )}

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-auto">
            <div className="w-full h-full p-4 md:p-6">
              <div className="w-full max-w-7xl mx-auto">
                <GeomarketingAnalyticsTab />
              </div>
            </div>
          </div>
        </main>

        {/* Live Driver Tracking Window - Persists across tabs */}
        {isVisible && (
          <LiveDriverTrackingWindow
            onClose={() => setIsVisible(false)}
            initialPosition={windowState.position}
            initialSize={windowState.size}
            initialIsMinimized={windowState.isMinimized}
            onMinimize={(isMinimized) => {
              setWindowState({
                ...windowState,
                isMinimized,
              });
            }}
          />
        )}
      </div>
    </div>
  );
}

function SidebarContent({
  logout,
}: {
  logout: () => void;
}) {
  const [location] = useLocation();

  return (
    <>
      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <NavItem
          href="/geomarketing/analytics"
          label="Analytics"
          active={location === "/geomarketing/analytics"}
        />
        <div className="my-2 border-t border-border" />
        <NavItem
          href="/admin/create-order"
          icon={<ArrowLeft className="w-5 h-5" />}
          label="Back to Admin"
          active={false}
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
  icon?: React.ReactNode;
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
        {icon && <span>{icon}</span>}
        <span className="truncate">{label}</span>
      </Button>
    </a>
  );
}
