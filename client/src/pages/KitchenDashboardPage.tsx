import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, ChefHat, MapPin, Clock, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function KitchenDashboardPage() {
  const { logout } = useAuth();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Fetch today's orders with items
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.getTodayOrdersWithItems.useQuery();

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

  // Filter to orders that need preparation (Pending and Ready)
  const kitchenOrders = allOrders.filter((o: any) =>
    ["Pending", "Ready"].includes(o.status)
  );

  // Auto-refetch every 3 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  const selectedOrder = kitchenOrders.find((o: any) => o.id === selectedOrderId) as any;

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Kitchen Dashboard</h1>
            <p className="text-sm text-muted-foreground">Order Preparation Queue</p>
          </div>
        </div>

        <Button
          variant="outline"
          className="gap-2"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-3xl font-bold text-yellow-800">
                  {kitchenOrders.filter((o: any) => o.status === "Pending").length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </Card>

          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready Orders</p>
                <p className="text-3xl font-bold text-blue-800">
                  {kitchenOrders.filter((o: any) => o.status === "Ready").length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-3xl font-bold text-green-800">
                  {kitchenOrders.length}
                </p>
              </div>
              <ChefHat className="w-8 h-8 text-green-600" />
            </div>
          </Card>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
          ) : kitchenOrders.length === 0 ? (
            <Card className="col-span-full p-12 text-center bg-green-50 border-green-200">
              <div className="text-4xl mb-4">✓</div>
              <p className="text-lg font-semibold text-green-800">All Orders Complete!</p>
              <p className="text-sm text-green-700 mt-2">No pending orders at the moment.</p>
            </Card>
          ) : (
            kitchenOrders.map((order: any) => (
              <Card
                key={order.id}
                className={`p-6 cursor-pointer transition-all border-2 flex flex-col ${
                  selectedOrderId === order.id
                    ? "border-accent bg-accent/5 shadow-lg"
                    : "border-border hover:border-accent/50"
                }`}
                onClick={() => setSelectedOrderId(order.id)}
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

                {/* Customer Address and Area */}
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
                    <p className="text-sm text-foreground bg-yellow-50 p-2 rounded border border-yellow-200">
                      {order.notes}
                    </p>
                  </div>
                )}

                {/* Action Button */}
                {order.status === "Pending" && (
                  <Button
                    className="w-full gap-2 bg-green-600 hover:bg-green-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkReady(order.id);
                    }}
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
                  <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded text-center">
                    <p className="text-sm font-semibold text-blue-800">Ready for Pickup</p>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-6 py-4 text-center text-sm text-muted-foreground">
        <p>Kitchen Dashboard • Real-time order updates every 3 seconds</p>
      </footer>
    </div>
  );
}
