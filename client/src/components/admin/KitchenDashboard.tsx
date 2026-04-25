import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { LogOut, ChefHat, MapPin, Clock, AlertCircle, CheckCircle2, Flame, X, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DeveloperCredit } from "@/components/DeveloperCredit";

export default function KitchenDashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("active");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [driverReturnTimes, setDriverReturnTimes] = useState<Record<number, string>>({});

  // Listen for return time updates from driver dashboard
  useEffect(() => {
    const handleReturnTimeUpdate = (event: any) => {
      const { driverId, returnTime } = event.detail;
      console.log("Kitchen received return time update:", { driverId, returnTime });
      setDriverReturnTimes((prev) => ({
        ...prev,
        [driverId]: returnTime,
      }));
    };

    // Load return times from localStorage on mount
    const loadReturnTimesFromStorage = () => {
      const times: Record<number, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("driver-return-time-")) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || "{}");
            if (data.driverId && data.returnTime) {
              times[data.driverId] = data.returnTime;
              console.log("Loaded return time from storage:", data);
            }
          } catch (e) {
            console.error("Failed to parse return time data:", e);
          }
        }
      }
      if (Object.keys(times).length > 0) {
        setDriverReturnTimes(times);
      }
    };

    loadReturnTimesFromStorage();
    window.addEventListener("driver-return-time-updated", handleReturnTimeUpdate);
    return () => window.removeEventListener("driver-return-time-updated", handleReturnTimeUpdate);
  }, []);

  // Poll for return time updates every second (countdown)
  useEffect(() => {
    const interval = setInterval(() => {
      setDriverReturnTimes((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((driverId) => {
          const time = updated[parseInt(driverId)];
          if (time && time !== "00:00") {
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

  const handleLogout = () => {
    // Clear session
    localStorage.removeItem("systemSessionToken");
    localStorage.removeItem("systemRole");
    localStorage.removeItem("systemUsername");
    // Redirect to home page
    setLocation("/");
  };

  // Fetch today's orders with items
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.getTodayOrdersWithItems.useQuery();

  // Fetch active drivers
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const activeDrivers = drivers.filter((d: any) => d.status === "online" && d.isActive);

  // Mutation to update order status to ready
  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: async () => {
      toast.success("Order marked as ready!");
      // Immediately invalidate the cache and refetch
      await utils.orders.getTodayOrdersWithItems.invalidate();
      await refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update order status");
    },
  });

  // Filter to pending orders only (for active view)
  const pendingOrders = allOrders.filter((o: any) => o.status === "Pending");

  // Filter to ready orders only
  const readyOrders = allOrders.filter((o: any) => o.status === "Ready");

  // Sort by delivery time (priority)
  const sortByDeliveryTime = (orders: any[]) => {
    return [...orders].sort((a, b) => {
      const timeA = a.deliveryTime ? new Date(a.deliveryTime).getTime() : Infinity;
      const timeB = b.deliveryTime ? new Date(b.deliveryTime).getTime() : Infinity;
      return timeA - timeB;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <div className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-orange-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kitchen Dashboard</h1>
              <p className="text-sm text-gray-500">The Barrel Restaurant (Pizza & Pasta)</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white">
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-2">Pending Orders</p>
              <p className="text-3xl font-bold text-orange-600">{pendingOrders.length}</p>
            </div>
          </Card>

          <Card className="bg-white">
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-2">Ready Orders</p>
              <p className="text-3xl font-bold text-green-600">{readyOrders.length}</p>
            </div>
          </Card>

          <Card className="bg-white">
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-2">Total Orders</p>
              <p className="text-3xl font-bold text-blue-600">{allOrders.length}</p>
            </div>
          </Card>

          <Card className="bg-white">
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-2">Active Drivers</p>
              <p className="text-3xl font-bold text-purple-600">{activeDrivers.length}</p>
            </div>
          </Card>
        </div>

        {/* Active Drivers Section */}
        <Card className="bg-white mb-6">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-gray-900">Active Drivers ({activeDrivers.length})</h2>
          </div>
          <div className="p-4">
            {activeDrivers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No active drivers</p>
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
          </div>
        </Card>

        {/* Tabs for Orders */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white border border-border">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Flame className="w-4 h-4" />
              Active Orders ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="prepared" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Prepared Orders ({readyOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortByDeliveryTime(pendingOrders).length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No pending orders</p>
                </div>
              ) : (
                sortByDeliveryTime(pendingOrders).map((order: any) => (
                  <Card
                    key={order.id}
                    className="bg-gradient-to-br from-orange-50 to-red-50 border-l-4 border-l-orange-500 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedOrder(order);
                    }}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">#{order.id}</h3>
                        <Badge className="bg-orange-100 text-orange-800 text-xs">Pending</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{order.customerName}</p>
                      <div className="space-y-2 mb-3">
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} className="text-xs text-gray-700">
                            <span className="font-medium">{item.quantity}x</span> {item.name}
                            {item.specialInstructions && (
                              <p className="text-gray-500 italic text-xs mt-1">Note: {item.specialInstructions}</p>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatusMutation.mutate({ orderId: order.id, status: "Ready" });
                        }}
                        disabled={updateStatusMutation.isPending}
                        className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        {updateStatusMutation.isPending ? "Updating..." : "Mark as Ready"}
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="prepared" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortByDeliveryTime(readyOrders).length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No prepared orders</p>
                </div>
              ) : (
                sortByDeliveryTime(readyOrders).map((order: any) => (
                  <Card
                    key={order.id}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-l-green-500 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedOrder(order);
                    }}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">#{order.id}</h3>
                        <Badge className="bg-green-100 text-green-800 text-xs">Ready</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{order.customerName}</p>
                      <div className="space-y-2 mb-3">
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} className="text-xs text-gray-700">
                            <span className="font-medium">{item.quantity}x</span> {item.name}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">Ready for pickup</p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Order #{selectedOrder.id}</DialogTitle>
              <DialogClose />
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">Customer</p>
                <p className="text-gray-900">{selectedOrder.customerName}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Items</p>
                <div className="space-y-1">
                  {selectedOrder.items?.map((item: any, idx: number) => (
                    <p key={idx} className="text-sm text-gray-700">
                      {item.quantity}x {item.name}
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Status</p>
                <Badge className={selectedOrder.status === "Pending" ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}>
                  {selectedOrder.status}
                </Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <DeveloperCredit />
    </div>
  );
}
