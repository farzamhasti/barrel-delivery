import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Package2, Truck, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getTodayInTimezone, isSameDay } from "@shared/timezone";

export default function Dashboard() {
  const { data: orders = [] } = trpc.orders.list.useQuery();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();

  // Filter orders for today using America/Toronto timezone
  const todayOrders = orders.filter((o: any) => isSameDay(o.createdAt, new Date()));

  const utils = trpc.useUtils();
  const pendingOrders = todayOrders.filter((o: any) => o.status === "Pending").length;
  const onTheWayOrders = todayOrders.filter((o: any) => o.status === "On the Way").length;
  const deliveredOrders = todayOrders.filter((o: any) => o.status === "Delivered").length;
  const activeDrivers = drivers.filter((d: any) => d.status === "online" && d.isActive);
  const activeDriverCount = activeDrivers.length;

  // Auto-refetch drivers every 5 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      utils.drivers.list.invalidate();
    }, 5000);
    return () => clearInterval(interval);
  }, [utils.drivers.list]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        {/* Stats Cards - 2/3 width */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <StatCard icon={<Package2 className="w-6 h-6" />} label="Pending" value={pendingOrders} color="bg-yellow-100 text-yellow-700" />
          <StatCard icon={<Truck className="w-6 h-6" />} label="On the Way" value={onTheWayOrders} color="bg-blue-100 text-blue-700" />
          <StatCard icon={<TrendingUp className="w-6 h-6" />} label="Delivered" value={deliveredOrders} color="bg-green-100 text-green-700" />
        </div>

        {/* Active Drivers Section - 1/3 width */}
        <div className="flex flex-col overflow-hidden">
          <Card className="overflow-hidden flex-1 flex flex-col">
            <div className="p-4 border-b border-border flex-shrink-0">
              <h3 className="text-lg font-semibold text-foreground">Active Drivers ({activeDriverCount})</h3>
            </div>
            
            {activeDriverCount === 0 ? (
              <div className="p-6 text-center flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">No active drivers</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto flex-1 p-4">
                {activeDrivers.map((driver: any) => (
                  <div
                    key={driver.id}
                    className="p-3 bg-muted rounded-lg border border-border hover:border-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">{driver.name}</h4>
                        <p className="text-xs text-muted-foreground">{driver.phone}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 text-xs">Online</Badge>
                    </div>
                    {driver.vehicleType && (
                      <p className="text-xs text-muted-foreground mt-1">{driver.vehicleType}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card className="p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4">Today's Orders</h2>
        {todayOrders.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No orders today</p>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Order ID</th>
                  <th className="text-left py-3 px-4 font-semibold">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-right py-3 px-4 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {todayOrders.slice(0, 10).map((order: any) => (
                  <tr key={order.id} className="border-b border-border hover:bg-muted/30">
                    <td className="py-3 px-4">#{order.id}</td>
                    <td className="py-3 px-4">{order.customer?.name}</td>
                    <td className="py-3 px-4"><Badge className={getStatusBadgeClass(order.status)}>{order.status}</Badge></td>
                    <td className="py-3 px-4 text-right">${order.totalPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card className="p-4 md:p-6">
      <div className={`w-10 md:w-12 h-10 md:h-12 rounded-lg ${color} flex items-center justify-center mb-3 md:mb-4`}><span className="w-5 md:w-6 h-5 md:h-6 flex items-center justify-center">{icon}</span></div>
      <p className="text-xs md:text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl md:text-3xl font-bold">{value}</p>
    </Card>
  );
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "Pending": return "bg-yellow-100 text-yellow-800";
    case "On the Way": return "bg-blue-100 text-blue-800";
    case "Delivered": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
}
