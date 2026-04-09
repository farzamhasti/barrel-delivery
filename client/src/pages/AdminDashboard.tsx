import { useState } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Menu, Package2, Truck, LogOut, Settings, Plus } from "lucide-react";
import MenuManagement from "@/components/admin/MenuManagement";
import OrderManagement from "@/components/admin/OrderManagement";
import DriverManagement from "@/components/admin/DriverManagement";
import Dashboard from "@/components/admin/Dashboard";
import CreateOrder from "@/components/admin/CreateOrder";

export default function AdminDashboard() {
  const [, params] = useRoute("/admin/*");
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const currentTab = (params as any)?.["*"] || "dashboard";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-20"} border-r border-border bg-card transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          {sidebarOpen && <h2 className="font-bold text-foreground">Barrel Delivery</h2>}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem
            href="/admin/dashboard"
            icon={<Package2 className="w-5 h-5" />}
            label="Dashboard"
            active={currentTab === "dashboard"}
            collapsed={!sidebarOpen}
          />
          <NavItem
            href="/admin/create-order"
            icon={<Plus className="w-5 h-5" />}
            label="New Order"
            active={currentTab === "create-order"}
            collapsed={!sidebarOpen}
          />
          <NavItem
            href="/admin/menu"
            icon={<Settings className="w-5 h-5" />}
            label="Menu"
            active={currentTab === "menu"}
            collapsed={!sidebarOpen}
          />
          <NavItem
            href="/admin/orders"
            icon={<Package2 className="w-5 h-5" />}
            label="Orders"
            active={currentTab === "orders"}
            collapsed={!sidebarOpen}
          />
          <NavItem
            href="/admin/drivers"
            icon={<Truck className="w-5 h-5" />}
            label="Drivers"
            active={currentTab === "drivers"}
            collapsed={!sidebarOpen}
          />
        </nav>

        <div className="p-4 border-t border-border">
          <Button
            variant="outline"
            className="w-full gap-2 justify-center"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && "Logout"}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {currentTab === "dashboard" && <Dashboard />}
          {currentTab === "create-order" && <CreateOrder />}
          {currentTab === "menu" && <MenuManagement />}
          {currentTab === "orders" && <OrderManagement />}
          {currentTab === "drivers" && <DriverManagement />}
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
  collapsed,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <a href={href}>
      <Button
        variant={active ? "default" : "ghost"}
        className={`w-full justify-start gap-3 ${collapsed ? "px-2" : ""}`}
      >
        {icon}
        {!collapsed && label}
      </Button>
    </a>
  );
}
