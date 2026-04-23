import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

  const sortedPendingOrders = sortByDeliveryTime(pendingOrders);
  const sortedReadyOrders = sortByDeliveryTime(readyOrders);

  // Auto-refetch every 3 seconds for real-time updates (but pause when modal is open)
  useEffect(() => {
    // Only refetch if no modal is open
    if (!selectedOrder) {
      const interval = setInterval(() => {
        refetch();
        // Also refetch drivers to get real-time status updates
        utils.drivers.list.invalidate();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedOrder, utils.drivers.list]);

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

  // Memoize the modal handler to prevent re-creation on every render
  const handleModalOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSelectedOrder(null);
    }
  }, []);

  const OrderDetailModal = ({ order }: { order: any }) => {
    if (!order) return null;
    
    const urgency = getUrgencyLevel(order.deliveryTime);
    const deliveryTime = order.deliveryTime ? new Date(order.deliveryTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A";
    const deliveryDate = order.deliveryTime ? new Date(order.deliveryTime).toLocaleDateString() : "N/A";

    return (
      <Dialog open={!!order} onOpenChange={handleModalOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" showCloseButton={false}>
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
            {order.area && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-orange-900 mb-3">Delivery Area</h3>
                <div className="flex items-center gap-3">
                  <MapPin className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-xs text-orange-700 font-medium">Area</p>
                    <p className="text-3xl font-bold text-orange-900">{order.area}</p>
                  </div>
                </div>
              </div>
            )}

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
                      </div>
                      <p className="font-semibold text-foreground">${item.price_at_order?.toFixed(2) || "0.00"}</p>
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
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={(e) => {
                e.stopPropagation();
                updateStatusMutation.mutate({
                  orderId: order.id,
                  status: "Ready",
                });
                setSelectedOrder(null);
              }}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Updating..." : "Mark Ready"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex flex-col">
      {/* Developer Credit */}
      <DeveloperCredit />
      
      {/* Main Content */}
      <div className="flex-1 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm p-4 border border-border/40">
          <div className="flex items-center gap-4">
            <img 
              src="/manus-storage/logo_dceb0304.png" 
              alt="The Barrel Restaurant (Pizza & Pasta)" 
              className="h-12 w-auto object-contain"
            />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Kitchen Dashboard</h1>
              <p className="text-xs text-muted-foreground">The Barrel Restaurant (Pizza & Pasta)</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleLogout()}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Stats Bar with Active Drivers Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Left: Stats Cards (3 columns) */}
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card className="p-3 bg-white/80 backdrop-blur">
              <p className="text-xs text-muted-foreground">Pending Orders</p>
              <p className="text-2xl font-bold text-orange-600">{pendingOrders.length}</p>
            </Card>
            <Card className="p-3 bg-white/80 backdrop-blur">
              <p className="text-xs text-muted-foreground">Ready Orders</p>
              <p className="text-2xl font-bold text-green-600">{readyOrders.length}</p>
            </Card>
            <Card className="p-3 bg-white/80 backdrop-blur">
              <p className="text-xs text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold text-foreground">{allOrders.length}</p>
            </Card>
          </div>

          {/* Right: Active Drivers Section */}
          <div className="flex flex-col overflow-hidden">
            <Card className="overflow-hidden flex-1 flex flex-col bg-white/80 backdrop-blur">
              <div className="p-4 border-b border-border flex-shrink-0">
                <h3 className="text-lg font-semibold text-foreground">Active Drivers ({activeDrivers.length})</h3>
              </div>
              
              {activeDrivers.length === 0 ? (
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
                          <td className="py-2 px-3 text-muted-foreground">{driver.estimatedReturnTime || '~15 min'}</td>
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

      {/* Tabs */}
      <div className="max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white rounded-lg shadow-md">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              Active Orders ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="ready" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Prepared Orders ({readyOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Orders Tab */}
          <TabsContent value="active" className="mt-6">
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

          {/* Prepared Orders Tab */}
          <TabsContent value="ready" className="mt-6">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            ) : sortedReadyOrders.length === 0 ? (
              <EmptyState message="No Prepared Orders" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-max">
                {sortedReadyOrders.map((order: any) => (
                  <Card key={order.id} className="p-3 border-2 border-green-500 bg-green-50">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg font-bold text-foreground">#{order.id}</h3>
                      <Badge className="bg-green-600 text-white text-xs px-2 py-0.5">Ready</Badge>
                    </div>
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {order.items?.slice(0, 2).map((item: any) => item.menuItemName).join(", ")}
                        {(order.items?.length || 0) > 2 ? "..." : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span className="font-semibold">
                        {order.deliveryTime ? new Date(order.deliveryTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>            )}\n          </TabsContent>\n        </Tabs>      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal order={selectedOrder} />
      </div>
    </div>
  );
}
