import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, ChefHat, MapPin, Clock, AlertCircle, CheckCircle2, Flame } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function KitchenDashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("active");

  const handleLogout = () => {
    // Clear session
    localStorage.removeItem("systemSessionToken");
    localStorage.removeItem("systemRole");
    localStorage.removeItem("systemUsername");
    // Redirect to kitchen login
    setLocation("/kitchen-login");
  };

  // Fetch today's orders with items
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.getTodayOrdersWithItems.useQuery();

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
        onClick={() => {}}
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

        {/* Delivery Time */}
        <div className="flex items-center gap-1 mb-3 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span className="font-semibold">{deliveryTime}</span>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4 md:p-6">
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
            onClick={() => handleLogout()}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
