"use client";

import { useState, useEffect } from "react";
import { useSystemSession } from "@/_core/hooks/useSystemSession";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, ChefHat, MapPin, Clock, AlertCircle, CheckCircle2, Flame } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { invalidateOrderCache } from "@/lib/invalidation";
import { toast } from "sonner";
import { useDriverReturnTime } from "@/contexts/DriverReturnTimeContext";
import { KitchenReservations } from "@/pages/KitchenReservations";
import { DeveloperCredit } from "@/components/DeveloperCredit";
import { useCountdownTimer } from "@/hooks/useCountdownTimer";

// Helper function to format return time from seconds to MM:SS format
function formatReturnTime(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Component to display a single driver with countdown timer
function DriverRowWithTimer({ driver }: { driver: any }) {
  const { displayTime } = useCountdownTimer(driver.estimatedReturnTime, driver.id);
  
  return (
    <tr className="border-b border-border hover:bg-muted/30">
      <td className="py-2 px-3">{driver.name}</td>
      <td className="py-2 px-3">
        <Badge className="bg-green-100 text-green-800 text-xs">Online</Badge>
      </td>
      <td className="py-2 px-3 text-muted-foreground font-mono">
        {driver.estimatedReturnTime ? displayTime : "00:00"}
      </td>
    </tr>
  );
}

export default function KitchenDashboardPage() {
  const utils = trpc.useUtils();
  const { logout, isLoading: authLoading } = useSystemSession();
  const { driverReturnTimes } = useDriverReturnTime();
  const [activeTab, setActiveTab] = useState("active");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Fetch today's orders with items
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.getTodayWithItems.useQuery();

  // Fetch active drivers
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const activeDrivers = drivers.filter((d: any) => d.status === "online" && d.isActive);

  // Fetch pending reservations count
  const { data: allReservations = [] } = trpc.reservations.getAll.useQuery();
  const pendingReservationsCount = allReservations.filter((r: any) => r.status === "Pending").length;

  // Mutation to update order status to ready
  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: async () => {
      toast.success("Order marked as ready!");
      // Immediately invalidate the cache and refetch
      await utils.orders.getTodayWithItems.invalidate();
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

  const sortedPendingOrders = sortByDeliveryTime(pendingOrders);
  const sortedReadyOrders = sortByDeliveryTime(readyOrders);

  // Auto-refetch every 3 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Calculate urgency level based on delivery time
  const getUrgencyLevel = (deliveryTime: string | null) => {
    if (!deliveryTime) return "normal";
    
    const now = new Date();
    const delivery = new Date(deliveryTime);
    const minutesUntilDelivery = (delivery.getTime() - now.getTime()) / (1000 * 60);

    if (minutesUntilDelivery < 0) return "late"; // Past delivery time
    if (minutesUntilDelivery < 15) return "urgent"; // Less than 15 minutes
    if (minutesUntilDelivery < 30) return "soon"; // Less than 30 minutes
    return "normal"; // 30+ minutes
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "late":
        return "border-red-500 bg-red-50 hover:bg-red-100";
      case "urgent":
        return "border-orange-500 bg-orange-50 hover:bg-orange-100";
      case "soon":
        return "border-yellow-500 bg-yellow-50 hover:bg-yellow-100";
      default:
        return "border-green-500 bg-green-50 hover:bg-green-100";
    }
  };

  const getUrgencyBadgeColor = (urgency: string) => {
    switch (urgency) {
      case "late":
        return "bg-red-500 text-white";
      case "urgent":
        return "bg-orange-500 text-white";
      case "soon":
        return "bg-yellow-500 text-white";
      default:
        return "bg-green-500 text-white";
    }
  };

  const CompactOrderCard = ({ order }: { order: any }) => {
    const urgency = getUrgencyLevel(order.deliveryTime);
    const itemsPreview = order.items?.slice(0, 2).map((item: any) => item.menuItemName).join(", ") || "No items";
    const hasMoreItems = (order.items?.length || 0) > 2;
    const deliveryTime = order.deliveryTime ? new Date(order.deliveryTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A";

    return (
      <Card
        className={`p-3 cursor-pointer transition-all border-2 flex flex-col ${getUrgencyColor(urgency)}`}
        onClick={() => setSelectedOrder(order)}
      >
        {/* Order Header with Number and Urgency Badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-bold text-foreground">#{order.orderNumber}</h3>
          {urgency !== "normal" && (
            <Badge className={`${getUrgencyBadgeColor(urgency)} text-xs px-2 py-0.5 flex items-center gap-1`}>
              {urgency === "late" && <AlertCircle className="w-3 h-3" />}
              {urgency === "urgent" && <Flame className="w-3 h-3" />}
              {urgency === "soon" && <Clock className="w-3 h-3" />}
              {urgency === "late" ? "LATE" : urgency === "urgent" ? "URGENT" : "SOON"}
            </Badge>
          )}
        </div>

        {/* Address with Location Icon */}
        <div className="mb-3 flex items-start gap-2">
          <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-foreground line-clamp-2">{order.customerAddress || 'N/A'}</p>
        </div>

        {/* Delivery Time with Clock Icon */}
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground">
          <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <span>{deliveryTime}</span>
        </div>

        {/* Formatted Receipt Image */}
        {order.formattedReceiptImage && (
          <div className="mb-3 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 p-2">
            <img 
              src={order.formattedReceiptImage} 
              alt="Receipt" 
              className="w-full h-auto max-h-32 object-contain rounded"
            />
          </div>
        )}

        {/* Notes (if exists) */}
        {order.notes && (
          <div className="mb-3 p-2 bg-white/50 rounded text-xs text-muted-foreground line-clamp-2">
            📝 {order.notes}
          </div>
        )}

        {/* Area Badge */}
        <div className="mb-3 flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-800 text-sm px-3 py-2 font-semibold">
            Area: {order.area || 'N/A'}
          </Badge>
        </div>

        {/* Mark Ready Button */}
        <Button
          size="sm"
          className="w-full mt-auto bg-green-600 hover:bg-green-700 text-white"
          onClick={(e) => {
            e.stopPropagation();
            updateStatusMutation.mutate({
              orderId: order.id,
              status: "Ready",
            });
          }}
          disabled={updateStatusMutation.isPending}
        >
          {updateStatusMutation.isPending ? "Updating..." : "Mark Ready"}
        </Button>
      </Card>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
      <p className="text-lg font-semibold text-foreground">{message}</p>
      <p className="text-sm text-muted-foreground mt-2">Great job! Keep up the good work.</p>
    </div>
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading kitchen dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4 md:p-6">
      <DeveloperCredit />
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-orange-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Kitchen Dashboard</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 bg-white/80 backdrop-blur">
            <p className="text-xs text-muted-foreground">Pending Orders</p>
            <p className="text-2xl font-bold text-orange-600">{pendingOrders.length}</p>
          </Card>
          <Card className="p-3 bg-white/80 backdrop-blur">
            <p className="text-xs text-muted-foreground">Ready Orders</p>
            <p className="text-2xl font-bold text-green-600">{readyOrders.length}</p>
          </Card>
          <Card className="p-3 bg-white/80 backdrop-blur">
            <p className="text-xs text-muted-foreground">Urgent Orders</p>
            <p className="text-2xl font-bold text-red-600">
              {pendingOrders.filter((o: any) => getUrgencyLevel(o.deliveryTime) === "late").length}
            </p>
          </Card>
          <Card className="p-3 bg-white/80 backdrop-blur">
            <p className="text-xs text-muted-foreground">Active Drivers</p>
            <p className="text-2xl font-bold text-purple-600">{activeDrivers.length}</p>
          </Card>
        </div>
      </div>

      {/* Active Drivers Section */}
      <div className="max-w-7xl mx-auto mb-6">
        <Card className="bg-white/80 backdrop-blur">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-gray-900">Active Drivers ({activeDrivers.length})</h2>
          </div>
          <div className="p-4">
            {activeDrivers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No active drivers</p>
            ) : (
              <div className="overflow-x-auto">
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
                      <DriverRowWithTimer key={driver.id} driver={driver} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" defaultValue="active">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-white rounded-lg shadow-sm">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              Active Orders ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="ready" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Prepared Orders ({readyOrders.length})
            </TabsTrigger>
            <TabsTrigger value="reservations" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Reservations ({pendingReservationsCount})
            </TabsTrigger>
          </TabsList>

          {/* Active Orders Tab */}
          <TabsContent value="active" className="space-y-4 mt-6">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            ) : sortedPendingOrders.length === 0 ? (
              <EmptyState message="All Orders Prepared! 🎉" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-max">
                {sortedPendingOrders.map((order: any) => (
                  <CompactOrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations" className="space-y-4 mt-6">
            <KitchenReservations />
          </TabsContent>

          {/* Prepared Orders Tab */}
          <TabsContent value="ready" className="space-y-4 mt-6">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            ) : sortedReadyOrders.length === 0 ? (
              <EmptyState message="No Prepared Orders" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-max">
                {sortedReadyOrders.map((order: any) => (
                  <Card key={order.id} className="p-3 border-2 border-green-500 bg-green-50 cursor-pointer hover:bg-green-100 transition-all" onClick={() => setSelectedOrder(order)}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg font-bold text-foreground">#{order.orderNumber}</h3>
                      <Badge className="bg-green-600 text-white text-xs px-2 py-0.5">Ready</Badge>
                    </div>
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground line-clamp-1">{order.customerAddress || 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span className="font-semibold">
                        {order.deliveryTime ? new Date(order.deliveryTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedOrder(null)}>
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Order #{selectedOrder.orderNumber}</h2>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
              </div>
              
              {/* Order Details */}
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="text-lg font-semibold">{selectedOrder.customerAddress || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Area</p>
                  <p className="text-lg font-semibold">{selectedOrder.area || 'N/A'}</p>
                </div>
                {selectedOrder.deliveryTime && (
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Time</p>
                    <p className="text-lg font-semibold">{new Date(selectedOrder.deliveryTime).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Receipt Image */}
              {selectedOrder.receiptImage && (
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-2">Receipt Image</p>
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 p-2 cursor-pointer" onClick={() => setZoomImageUrl(selectedOrder.receiptImage)}>
                    <img 
                      src={selectedOrder.receiptImage} 
                      alt="Receipt" 
                      className="w-full h-auto max-h-96 object-contain rounded hover:opacity-90 transition-opacity"
                    />
                    <p className="text-xs text-center text-muted-foreground mt-2">Click to zoom</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomImageUrl && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50" onClick={() => setZoomImageUrl(null)}>
          <div className="relative w-full max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoomImageUrl(null)} className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl">✕</button>
            <img 
              src={zoomImageUrl} 
              alt="Zoomed Receipt" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
