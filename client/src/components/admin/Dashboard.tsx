import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { data: activeDrivers = [] } = trpc.driver.getActiveDrivers.useQuery();
  const { data: todayOrders = [] } = trpc.orders.getTodayOrdersWithItems.useQuery();
  const [driverReturnTimes, setDriverReturnTimes] = useState<Record<number, string>>({});

  const activeDriverCount = activeDrivers.length;

  // Poll for return time updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Update countdown for each driver
      setDriverReturnTimes((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((driverId) => {
          const time = updated[parseInt(driverId)];
          if (time && time !== "--:--") {
            const [minutes, seconds] = time.split(":").map(Number);
            let totalSeconds = minutes * 60 + seconds - 1;
            if (totalSeconds < 0) totalSeconds = 0;
            const newMinutes = Math.floor(totalSeconds / 60);
            const newSeconds = totalSeconds % 60;
            updated[parseInt(driverId)] = `${String(newMinutes).padStart(2, "0")}:${String(newSeconds).padStart(2, "0")}`;
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "ready":
        return "bg-blue-100 text-blue-800";
      case "on_the_way":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {todayOrders.filter((o: any) => o.status === "pending").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">On the Way</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {todayOrders.filter((o: any) => o.status === "on_the_way").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {todayOrders.filter((o: any) => o.status === "delivered").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Drivers and Today's Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Drivers Table */}
        <div className="lg:col-span-1 flex flex-col overflow-hidden">
          <Card className="overflow-hidden flex-1 flex flex-col">
            <div className="p-4 border-b border-border flex-shrink-0">
              <h3 className="text-lg font-semibold text-foreground">Active Drivers ({activeDriverCount})</h3>
            </div>
            
            {activeDriverCount === 0 ? (
              <div className="p-6 text-center flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">No active drivers</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-2 px-3 font-semibold">Name</th>
                      <th className="text-left py-2 px-3 font-semibold">Status</th>
                      <th className="text-left py-2 px-3 font-semibold">Est. Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDrivers.map((driver: any) => (
                      <tr key={driver.id} className="border-b border-border hover:bg-muted/30">
                        <td className="py-2 px-3">{driver.name}</td>
                        <td className="py-2 px-3">
                          <Badge className="bg-green-100 text-green-800 text-xs">Online</Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground font-mono">
                          {driverReturnTimes[driver.id] || "00:00"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Today's Orders */}
        <div className="lg:col-span-2">
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
      </div>
    </div>
  );
}
