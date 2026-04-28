import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  // Fetch today's orders with items
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.getTodayWithItems.useQuery();

  // Fetch active drivers
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const activeDrivers = drivers.filter((d: any) => d.status === "online" && d.isActive);

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
  }, [allOrders, selectedOrder]);

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

  const memoizedOrder = useMemo(() => selectedOrder, [selectedOrder]);

  const OrderDetailModal = useCallback(
    ({ order }: { order: any }) => {
      return (
        <Dialog open={!!order} onOpenChange={handleModalOpenChange}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between w-full">
                <DialogTitle>Order Details</DialogTitle>
                <DialogClose asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </DialogHeader>
            {order && (
              <>
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Address</p>
                        <p className="text-sm font-medium">{order.customerAddress}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Phone</p>
                        <p className="text-sm font-medium">{order.customerPhone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Area</p>
                        <p className="text-sm font-medium">{order.area}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Status</p>
                        <p className="text-sm font-medium">{order.status}</p>
                      </div>
                      {order.deliveryTime && (
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Delivery Time</p>
                          <p className="text-sm font-medium">
                            {new Date(order.deliveryTime).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scanned Receipt Image Section */}
                  {order.receiptImage && (
                    <div className="bg-white border border-gray-300 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-foreground mb-3">Scanned Receipt</h3>
                      <img
                        src={order.receiptImage}
                        alt="Scanned Receipt"
                        className="w-full rounded border max-h-96 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setZoomImageUrl(order.receiptImage)}
                      />
                      <p className="text-xs text-gray-500 mt-2 text-center">Click to zoom</p>
                    </div>
                  )}

                  {/* Order Items Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Order Items</h3>
                    <div className="space-y-2">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{item.menuItemName}</p>
                              <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No items</p>
                      )}
                    </div>
                  </div>

                  {/* Notes Section */}
                  {order.notes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-yellow-900 mb-2">Special Notes</h3>
                      <p className="text-sm text-yellow-800">{order.notes}</p>
                    </div>
                  )}

                  {/* Mark Ready Button */}
                  <Button
                    size="lg"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      console.log('[KitchenDashboard] Mark Order as Ready clicked for order:', order.id);
                      updateStatusMutation.mutate({
                        orderId: order.id,
                        status: "Ready",
                      });
                      console.log('[KitchenDashboard] Mutation triggered');
                    }}
                    disabled={updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending ? "Updating..." : "Mark Order as Ready"}
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      );
    },
    [handleModalOpenChange, updateStatusMutation]
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
      </div>

    <DeveloperCredit />
    </div>
  );
}
