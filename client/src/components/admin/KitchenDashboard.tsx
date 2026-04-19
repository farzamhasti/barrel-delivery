import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function KitchenDashboard() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Fetch all orders and filter on client side
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.list.useQuery();
  
  // Filter to orders that need preparation
  const orders = allOrders.filter((o: any) => 
    ["Pending", "Ready"].includes(o.status)
  );

  // Mutation to update order status to ready
  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Order marked as ready!");
      refetch();
      setSelectedOrderId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update order status");
    },
  });

  // Auto-refetch every 3 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  const selectedOrder = orders.find((o: any) => o.id === selectedOrderId) as any;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Ready":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleMarkReady = (orderId: number) => {
    updateStatusMutation.mutate({
      orderId,
      status: "Ready",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Kitchen Dashboard</h2>
        <p className="text-muted-foreground mt-1">Manage orders and mark them as ready</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Queue */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Order Queue</CardTitle>
              <CardDescription>{orders.length} orders to prepare</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="text-center text-muted-foreground py-8">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No orders to prepare</div>
                ) : (
                  orders.map((order: any) => (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedOrderId === order.id
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">Order #{order.id}</div>
                          <div className="text-sm text-muted-foreground truncate">{order.customerName}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                              {order.status.replace("_", " ").toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {order.orderItems?.length || 0} items
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Details */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Order #{selectedOrder.id}</CardTitle>
                    <CardDescription>
                      <Badge className={`mt-2 ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </CardDescription>
                  </div>
                  {selectedOrder.status !== "ready" && (
                    <Button
                      onClick={() => handleMarkReady(selectedOrder.id)}
                      disabled={updateStatusMutation.isPending}
                      className="gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {updateStatusMutation.isPending ? "Marking..." : "Mark Ready"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Customer Info */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="font-semibold text-foreground">{selectedOrder.customerName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <div className="font-semibold text-foreground">{selectedOrder.customerPhone}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-sm text-muted-foreground">Address</div>
                    <div className="font-semibold text-foreground">{selectedOrder.customerAddress}</div>
                  </div>
                </div>

                {/* Items (No Prices) */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Items to Prepare</h3>
                  <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                    {selectedOrder.orderItems?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <div className="font-semibold text-foreground">{item.menuItemName}</div>
                          <div className="text-sm text-muted-foreground">Qty: {item.quantity}</div>
                        </div>
                        <div className="text-lg font-bold text-accent">{item.quantity}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Time */}
                {selectedOrder.hasDeliveryTime && selectedOrder.deliveryTime && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-green-900">Expected Delivery Time</div>
                        <div className="text-sm text-green-800 mt-1">
                          {new Date(selectedOrder.deliveryTime).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Notes */}
                {selectedOrder.customerNotes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-blue-900">Special Instructions</div>
                        <div className="text-sm text-blue-800 mt-1">{selectedOrder.customerNotes}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Info */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Order created: {new Date(selectedOrder.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[400px]">
                <div className="text-center text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select an order to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
