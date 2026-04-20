import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, MapPin } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function KitchenDashboard() {
  // Fetch all orders with items and delivery time for today
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.getTodayOrdersWithItems.useQuery();
  
  // Filter to orders that need preparation
  const orders = allOrders.filter((o: any) => 
    ["Pending", "Ready"].includes(o.status)
  );

  // Mutation to update order status to ready
  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Order marked as ready!");
      refetch();
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

  const pendingCount = orders.filter((o: any) => o.status === "Pending").length;
  const readyCount = orders.filter((o: any) => o.status === "Ready").length;

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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">Kitchen Dashboard</h2>
        <p className="text-muted-foreground mt-1">Manage orders and mark them as ready</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Orders */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-3xl font-bold text-yellow-800">{pendingCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        {/* Ready Orders */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready Orders</p>
                <p className="text-3xl font-bold text-blue-800">{readyCount}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-3xl font-bold text-green-800">{orders.length}</p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        ) : orders.length === 0 ? (
          <Card className="col-span-full p-12 text-center bg-green-50 border-green-200">
            <div className="text-4xl mb-4">✓</div>
            <p className="text-lg font-semibold text-green-800">All Orders Complete!</p>
            <p className="text-sm text-green-700 mt-2">No pending orders at the moment.</p>
          </Card>
        ) : (
          orders.map((order: any) => (
            <Card
              key={order.id}
              className={`p-6 border-2 flex flex-col ${
                order.status === "Pending"
                  ? "border-yellow-300 bg-yellow-50"
                  : "border-blue-300 bg-blue-50"
              }`}
            >
              {/* Order Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Order #{order.id}</h3>
                  <p className="text-sm text-muted-foreground">{order.customer?.name}</p>
                </div>
                <Badge className={`${getStatusColor(order.status)} text-sm px-3 py-1`}>
                  {order.status}
                </Badge>
              </div>

              {/* Customer Address */}
              <div className="flex items-start gap-2 mb-4 pb-4 border-b border-border">
                <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-2">{order.customerAddress || order.customer?.address}</p>
                  {order.area && <p className="text-xs font-semibold text-accent mt-1">Area: {order.area}</p>}
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-4 flex-1">
                <h4 className="font-semibold text-foreground mb-2">Items:</h4>
                {order.items?.length ? (
                  <div className="space-y-1">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{item.menuItemName}</span>
                        <span className="font-semibold text-accent">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No items</p>
                )}
              </div>

              {/* Customer Notes */}
              {order.notes && (
                <div className="mb-4 pb-4 border-t border-border pt-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">NOTES:</p>
                  <p className="text-sm text-foreground bg-yellow-100 p-2 rounded border border-yellow-300">
                    {order.notes}
                  </p>
                </div>
              )}

              {/* Delivery Time */}
              {order.hasDeliveryTime && order.deliveryTime && (
                <div className="mb-4 pb-4 border-t border-border pt-4">
                  <div className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-green-700 mb-1">DELIVERY TIME:</p>
                      <p className="text-sm font-semibold text-green-800 bg-green-100 p-2 rounded border border-green-300">
                        {new Date(order.deliveryTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              {order.status === "Pending" && (
                <Button
                  className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleMarkReady(order.id)}
                  disabled={updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      ✓ Mark Ready
                    </>
                  )}
                </Button>
              )}

              {order.status === "Ready" && (
                <div className="w-full p-3 bg-blue-100 border border-blue-300 rounded text-center">
                  <p className="text-sm font-semibold text-blue-800">Ready for Pickup</p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
