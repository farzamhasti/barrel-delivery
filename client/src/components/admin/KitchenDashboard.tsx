import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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

export default function KitchenDashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { driverReturnTimes } = useDriverReturnTime();
  const [activeTab, setActiveTab] = useState("active");
  const { data: reservations = [] } = trpc.reservations.list.useQuery();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);


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

  // Auto-refetch every 3 seconds for real-time updates (but pause when modal is open)
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Only refetch if no modal is open
    if (!selectedOrder) {
      intervalRef.current = setInterval(() => {
        refetch();
        // Also refetch drivers to get real-time status updates
        utils.drivers.list.invalidate();
      }, 3000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selectedOrder, refetch, utils]);

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
          <h3 className="text-lg font-bold text-foreground">#{order.id}</h3>
          {urgency !== "normal" && (
            <Badge className={`${getUrgencyBadgeColor(urgency)} text-xs px-2 py-0.5 flex items-center gap-1`}>
              {urgency === "late" && <AlertCircle className="w-3 h-3" />}
              {urgency === "urgent" && <Flame className="w-3 h-3" />}
              {urgency === "soon" && <Clock className="w-3 h-3" />}
              {urgency === "late" ? "LATE" : urgency === "urgent" ? "URGENT" : "SOON"}
            </Badge>
          )}
        </div>

        {/* Items Preview */}
        <div className="mb-2">
          <p className="text-xs text-muted-foreground line-clamp-1">{itemsPreview}{hasMoreItems ? "..." : ""}</p>
        </div>

        {/* Area Display */}
        {order.area && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-orange-100 border-l-4 border-orange-500 rounded">
            <MapPin className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-orange-700 font-medium">Area</p>
              <p className="text-lg font-bold text-orange-900">{order.area}</p>
            </div>
          </div>
        )}

        {/* Delivery Time and Price */}
        <div className="flex items-center justify-between gap-2 mb-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="font-semibold">{deliveryTime}</span>
          </div>
          {order.total && (
            <div className="text-lg font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
              ${order.total.toFixed(2)}
            </div>
          )}
        </div>

        {/* Notes (if exists) */}
        {order.notes && (
          <div className="mb-3 p-2 bg-white/50 rounded text-xs text-muted-foreground line-clamp-2">
            📝 {order.notes}
          </div>
        )}

        {/* Mark Ready Button */}
        <Button
          size="sm"
          className="w-full mt-auto bg-green-600 hover:bg-green-700 text-white"
          onClick={(e) => {
            e.stopPropagation();
            try {
              updateStatusMutation.mutate({
                orderId: order.id,
                status: "Ready",
              });
            } catch (error) {
              console.error("Error marking order ready:", error);
              toast.error("Failed to mark order as ready");
            }
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

  // Memoize the modal handler to prevent re-creation on every render
  const handleModalOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSelectedOrder(null);
    }
  }, []);

  // Use useMemo to stabilize the order object
  const memoizedOrder = useMemo(() => selectedOrder, [selectedOrder?.id]);
  
  const OrderDetailModal = useCallback(function OrderDetailModal({ order }: { order: any }) {
    if (!order) return null;
    
    const urgency = getUrgencyLevel(order.deliveryTime);
    const deliveryTime = order.deliveryTime ? new Date(order.deliveryTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A";
    const deliveryDate = order.deliveryTime ? new Date(order.deliveryTime).toLocaleDateString() : "N/A"

    return (
      <Dialog open={!!order} onOpenChange={handleModalOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" showCloseButton={false}>
          <DialogDescription className="hidden" />
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-2xl">Order #{order.id}</DialogTitle>
                {urgency !== "normal" && (
                  <Badge className={`${getUrgencyBadgeColor(urgency)} text-xs px-2 py-0.5 flex items-center gap-1`}>
                    {urgency === "late" && <AlertCircle className="w-3 h-3" />}
                    {urgency === "urgent" && <Flame className="w-3 h-3" />}
                    {urgency === "soon" && <Clock className="w-3 h-3" />}
                    {urgency === "late" ? "LATE" : urgency === "urgent" ? "URGENT" : "SOON"}
                  </Badge>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedOrder(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Information Section */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-900 mb-3">Customer Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-purple-700 font-medium min-w-20">Name:</span>
                  <span className="text-purple-900">{order.customerName || "N/A"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-700 font-medium min-w-20">Phone:</span>
                  <span className="text-purple-900">{order.customerPhone || "N/A"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-700 font-medium min-w-20">Address:</span>
                  <span className="text-purple-900 break-words">{order.customerAddress || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Area Section */}
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-orange-900 mb-3">Delivery Area</h3>
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-xs text-orange-700 font-medium">Area</p>
                  <p className="text-3xl font-bold text-orange-900">{order.area || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Delivery Time Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">Delivery Time</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-blue-700">Time</p>
                    <p className="text-lg font-bold text-blue-900">{deliveryTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-blue-700">Date</p>
                    <p className="text-lg font-bold text-blue-900">{deliveryDate}</p>
                  </div>
                </div>
              </div>
            </div>

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
                        {item.specialInstructions && (
                          <p className="text-xs text-orange-600 mt-1">Note: {item.specialInstructions}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">${((item.price_at_order || 0) * (item.quantity || 0)).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">${(item.price_at_order || 0).toFixed(2)} each</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No items</p>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">${((order.total || 0) as number).toFixed(2)}</span>
                </div>
                {order.tax && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax:</span>
                    <span className="font-medium">${(order.tax as number).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-300 pt-2 flex justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-lg">${(order.total || 0).toFixed(2)}</span>
                </div>
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
                try {
                  updateStatusMutation.mutate({
                    orderId: order.id,
                    status: "Ready",
                  });
                  console.log('[KitchenDashboard] Mutation triggered');
                } catch (error) {
                  console.error('[KitchenDashboard] Error triggering mutation:', error);
                }
              }}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Updating..." : "Mark Order as Ready"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }, [handleModalOpenChange, updateStatusMutation, getUrgencyLevel]);

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
          <TabsList className="grid w-full grid-cols-3 bg-white border border-border gap-0">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Flame className="w-4 h-4" />
              Active Orders ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="prepared" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Prepared Orders ({readyOrders.length})
            </TabsTrigger>
            <TabsTrigger value="reservations" className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Reservations ({reservations.filter((r: any) => r.status === "pending").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedPendingOrders.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No pending orders</p>
                </div>
              ) : (
                sortedPendingOrders.map((order: any) => (
                  <CompactOrderCard key={order.id} order={order} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="prepared" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedReadyOrders.length === 0 ? (
                <EmptyState message="No prepared orders yet" />
              ) : (
                sortedReadyOrders.map((order: any) => (
                  <CompactOrderCard key={order.id} order={order} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="reservations" className="mt-4">
            <ReservationsList reservations={reservations} onRefresh={refetch} />
          </TabsContent>
        </Tabs>

      {/* Order Detail Modal */}
      {memoizedOrder && <OrderDetailModal order={memoizedOrder} />}
      </div>

    <DeveloperCredit />
    </div>
  );
}


function ReservationsList({
  reservations,
  onRefresh,
}: {
  reservations: any[];
  onRefresh: () => void;
}) {
  const updateStatusMutation = trpc.reservations.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Reservation marked as done");
      onRefresh();
    },
    onError: (error) => {
      toast.error(`Failed to update reservation: ${error.message}`);
    },
  });

  const pendingReservations = reservations.filter((r) => r.status === "pending");
  const completedReservations = reservations.filter((r) => r.status === "completed");

  const EmptyReservationState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Gift className="w-12 h-12 text-gray-300 mb-4" />
      <p className="text-lg font-semibold text-foreground">{message}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Pending Reservations</h3>
        {pendingReservations.length === 0 ? (
          <EmptyReservationState message="No pending reservations" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingReservations.map((reservation) => (
              <Card key={reservation.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">{reservation.eventType}</h4>
                    <p className="text-sm text-muted-foreground">
                      {reservation.numberOfPeople} people
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-yellow-50">
                    Pending
                  </Badge>
                </div>

                {reservation.details && (
                  <p className="text-sm text-muted-foreground">{reservation.details}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>📅 {new Date(reservation.eventDate).toLocaleDateString()}</span>
                  <span>🕐 {reservation.eventTime}</span>
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    updateStatusMutation.mutate({
                      id: reservation.id,
                      status: "completed",
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending ? "Updating..." : "Mark as Done"}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {completedReservations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Completed Reservations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedReservations.map((reservation) => (
              <Card key={reservation.id} className="p-4 space-y-3 opacity-75">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">{reservation.eventType}</h4>
                    <p className="text-sm text-muted-foreground">
                      {reservation.numberOfPeople} people
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-50">
                    Done
                  </Badge>
                </div>

                {reservation.details && (
                  <p className="text-sm text-muted-foreground">{reservation.details}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>📅 {new Date(reservation.eventDate).toLocaleDateString()}</span>
                  <span>🕐 {reservation.eventTime}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}