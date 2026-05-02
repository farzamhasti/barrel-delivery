import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { LogOut, ChefHat, MapPin, Clock, AlertCircle, CheckCircle2, Flame, X, Calendar, Gift } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DeveloperCredit } from "@/components/DeveloperCredit";
import { useDriverReturnTime } from "@/contexts/DriverReturnTimeContext";
import { ImageZoomModal } from "@/components/ImageZoomModal";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useCountdownTimer } from "@/hooks/useCountdownTimer";

export default function KitchenDashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { driverReturnTimes } = useDriverReturnTime();
  const [activeTab, setActiveTab] = useState("active");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);


  const handleLogout = () => {
    // Clear session
    localStorage.removeItem("systemSessionToken");
    localStorage.removeItem("systemRole");
    localStorage.removeItem("systemUsername");
    // Redirect to home page
    setLocation("/");
  };

  // Fetch today's orders with items with stale time 0 to always fetch fresh data
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.getTodayWithItems.useQuery(undefined, {
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache in garbage collector
  });

  // Fetch active drivers with real-time polling (3-second interval) - matching OrderTrackingWithMap
  const { data: drivers = [] } = trpc.drivers.list.useQuery(undefined, {
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
  const activeDrivers = drivers.filter((d: any) => d.status === "online" && d.isActive);
  
  // Get drivers with on_the_way orders
  const driversWithOnTheWayOrders = new Set(
    allOrders
      .filter((order: any) => order.status === 'On the Way')
      .map((order: any) => order.driverId)
  );

  // Mutation to update order status to ready
  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: async () => {
      toast.success("Order marked as ready!");
      // Immediately invalidate the cache and refetch
      await utils.orders.getTodayWithItems.invalidate();
      await refetch();
    },
    onError: (error) => {
      const errorMsg = error?.message || "Failed to update order status";
      console.error("Order status update error:", errorMsg);
      toast.error(errorMsg);
    },
  });

  // Keep selectedOrder in sync with updated allOrders
  useEffect(() => {
    if (selectedOrder && allOrders.length > 0) {
      const updatedOrder = allOrders.find((o: any) => o.id === selectedOrder.id);
      if (updatedOrder && updatedOrder !== selectedOrder) {
        setSelectedOrder(updatedOrder);
      }
    }
  }, [allOrders]);
  


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

  const handleModalOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSelectedOrder(null);
    }
  }, []);

  // Note: Orders are already configured with staleTime: 0 and gcTime: 0 above for real-time updates
  
  // Get drivers with on_the_way orders
  const driversWithOnTheWayOrders = new Set(
    allOrders
      .filter((order: any) => order.status === 'On the Way')
      .map((order: any) => order.driverId)
  );
  
  // Component to display a single driver with countdown timer
  const DriverRow = ({ driver, hasOnTheWayOrders }: { driver: any; hasOnTheWayOrders: boolean }) => {
    const { displayTime } = useCountdownTimer(driver.estimatedReturnTime, driver.id);
    
    // Only show timer if driver has on_the_way orders AND has set estimated return time
    const shouldShowTimer = hasOnTheWayOrders && driver.estimatedReturnTime && driver.estimatedReturnTime > 0;
    
    return (
      <tr className="border-b border-border hover:bg-muted/30">
        <td className="py-2 px-3">{driver.name}</td>
        <td className="py-2 px-3">
          <Badge className="bg-green-100 text-green-800 text-xs">Online</Badge>
        </td>
        <td className="py-2 px-3 text-muted-foreground font-mono">
          {shouldShowTimer ? displayTime : "00:00"}
        </td>
      </tr>
    );
  };

  // Force refetch on component mount
  useEffect(() => {
    refetch();
  }, []);

  const memoizedOrder = useMemo(() => selectedOrder, [selectedOrder]);



  const OrderDetailModal = useCallback(
    ({ order }: { order: any }) => {
      return (
        <Dialog open={!!order} onOpenChange={handleModalOpenChange}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between w-full">
                <DialogTitle>Order #{order?.orderNumber} - Scanned Receipt</DialogTitle>
                <DialogClose asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </DialogHeader>
            {order && (
              <div className="space-y-4">
                {/* Scanned Receipt Image Section */}
                {order.receiptImage ? (
                  <div className="bg-white border border-gray-300 rounded-lg p-4">
                    <img
                      src={order.receiptImage}
                      alt="Scanned Receipt"
                      className="w-full rounded border object-contain cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setZoomImageUrl(order.receiptImage)}
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">Click to zoom</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No scanned receipt image available for this order</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      );
    },
    [handleModalOpenChange]
  );

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

        {/* Tabs for Orders */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white border border-border gap-0">
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
            <div className="space-y-2">
              {sortedPendingOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No pending orders</p>
                </div>
              ) : (
                sortedPendingOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">Order #{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">{order.customerAddress}</p>
                        <p className="text-sm text-gray-600">{order.customerPhone}</p>
                        <p className="text-sm text-gray-600">Area: {order.area}</p>
                        {order.deliveryTime && (
                          <p className="text-sm text-gray-600">Delivery: {new Date(order.deliveryTime).toLocaleString()}</p>
                        )}
                        <p className="text-sm font-medium">Status: {order.status}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="prepared" className="mt-4">
            <div className="space-y-2">
              {sortedReadyOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No prepared orders</p>
                </div>
              ) : (
                sortedReadyOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">Order #{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">{order.customerAddress}</p>
                        <p className="text-sm text-gray-600">{order.customerPhone}</p>
                        <p className="text-sm text-gray-600">Area: {order.area}</p>
                        {order.deliveryTime && (
                          <p className="text-sm text-gray-600">Delivery: {new Date(order.deliveryTime).toLocaleString()}</p>
                        )}
                        <p className="text-sm font-medium">Status: {order.status}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
        <Card className="mt-6 bg-white">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Active Drivers ({activeDrivers.length})</h3>
          </div>
          
          {activeDrivers.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-muted-foreground">No active drivers</p>
            </div>
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
                    <DriverRow 
                      key={driver.id} 
                      driver={driver}
                      hasOnTheWayOrders={driversWithOnTheWayOrders.has(driver.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Order Detail Modal */}
      {memoizedOrder && <OrderDetailModal order={memoizedOrder} />}

      {/* Image Zoom Modal */}
      {zoomImageUrl && (
        <ImageZoomModal
          isOpen={true}
          imageUrl={zoomImageUrl}
          imageAlt="Scanned Receipt"
          onClose={() => setZoomImageUrl(null)}
        />
      )}

      <DeveloperCredit />
    </div>
  );
}
