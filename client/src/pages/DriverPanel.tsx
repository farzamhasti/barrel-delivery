import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, MapPin, Phone, Clock, Navigation, RotateCcw, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { invalidateOrderCache } from "@/lib/invalidation";
import { toast } from "sonner";

export default function DriverPanel() {
  const utils = trpc.useUtils();
  const { logout } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);

  // Fetch today's orders
  const { data: orders = [], isLoading, refetch } = trpc.orders.getTodayWithItems.useQuery();
  
  // Fetch selected order with items
  const { data: selectedOrderData } = trpc.orders.getWithItems.useQuery(
    { orderId: selectedOrder! },
    { enabled: !!selectedOrder }
  );
  
  // Update order status mutation
  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      invalidateOrderCache(utils);
      toast.success("Order status updated!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update order status");
    },
  });

  // Auto-refetch every 5 seconds
  // Cache invalidation from Orders tab will also trigger immediate refresh
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleStatusUpdate = (orderId: number, newStatus: "Pending" | "Ready" | "On the Way" | "Delivered") => {
    updateStatusMutation.mutate({
      orderId: orderId,
      status: newStatus,
    });
  };

  const handleOpenMaps = (address: string) => {
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
    window.open(mapsUrl, "_blank");
  };

  // Removed incomplete status update functions

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Ready":
        return "bg-blue-100 text-blue-800";
      case "On the Way":
        return "bg-purple-100 text-purple-800";
      case "Delivered":
        return "bg-green-100 text-green-800";

      default:
        return "bg-gray-100 text-gray-800";
    }
  };



  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Driver Panel</h1>
          <Button
            variant="outline"
            onClick={() => logout()}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Orders List */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-foreground mb-4">Your Orders</h2>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              </div>
            ) : orders.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No orders assigned yet</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order: any) => (
                  <Card
                    key={order.id}
                    className={`p-4 cursor-pointer transition-all border-2 ${
                      selectedOrder === order.id
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/50"
                    }`}
                    onClick={() => setSelectedOrder(order.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">Order #{order.orderNumber}</h3>
                        <p className="text-sm text-muted-foreground">{order.customerName}</p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {order.customerPhone}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {order.customerAddress}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {selectedOrder === order.id && (
                      <div className="border-t border-border pt-4 mt-4 space-y-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={order.status === "Pending" ? "default" : "outline"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(order.id, "Pending");
                            }}
                          >
                            Pending
                          </Button>
                          <Button
                            size="sm"
                            variant={order.status === "Ready" ? "default" : "outline"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(order.id, "Ready");
                            }}
                          >
                            Ready
                          </Button>
                          <Button
                            size="sm"
                            variant={order.status === "On the Way" ? "default" : "outline"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(order.id, "On the Way");
                            }}
                          >
                            On the Way
                          </Button>
                          <Button
                            size="sm"
                            variant={order.status === "Delivered" ? "default" : "outline"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(order.id, "Delivered");
                            }}
                          >
                            Delivered
                          </Button>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-border">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenMaps(order.customerAddress || "");
                            }}
                          >
                            <Navigation className="w-4 h-4" />
                            Navigate
                          </Button>

                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Order Details */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold text-foreground mb-4">Order Details</h2>
            
            {selectedOrderData ? (
              <Card className="p-4 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Order Total</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${(Number(selectedOrderData.totalPrice) || 0).toFixed(2)}
                  </p>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Order Items</p>
                  <div className="space-y-2">
                    {selectedOrderData.items?.length ? (
                      selectedOrderData.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.menuItemName}</span>
                          <span className="text-muted-foreground">${((Number(item.priceAtOrder) || 0) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No items</p>
                    )}
                  </div>
                </div>

                {/* Receipt Image Display */}
                {selectedOrderData.receiptImage && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 p-3 pb-0">Receipt Image</p>
                    <img
                      src={selectedOrderData.receiptImage}
                      alt="Receipt"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}

                {/* Special instructions not available in new schema */}

                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-2">📍 Location Sharing</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Your location is being shared with the customer for real-time tracking.
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                Select an order to view details
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
