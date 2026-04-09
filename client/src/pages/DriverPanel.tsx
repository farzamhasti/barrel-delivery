import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, MapPin, Phone, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function DriverPanel() {
  const { logout } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);

  // Fetch driver's orders
  const { data: orders = [], isLoading } = trpc.orders.list.useQuery({ driverId: 1 });
  
  // Update order status mutation
  const updateStatusMutation = trpc.orders.updateStatus.useMutation();

  const handleStatusUpdate = (orderId: number, newStatus: "Pending" | "On the Way" | "Delivered") => {
    updateStatusMutation.mutate(
      { orderId, status: newStatus },
      {
        onSuccess: () => {
          // Invalidate and refetch
          trpc.useUtils().orders.list.invalidate();
        },
      }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "On the Way":
        return "bg-blue-100 text-blue-800";
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
                        <h3 className="font-semibold text-foreground">Order #{order.id}</h3>
                        <p className="text-sm text-muted-foreground">{order.customer?.name}</p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {order.customer?.phone}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {order.customer?.address}
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
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Order Details & Map */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold text-foreground mb-4">Order Details</h2>
            
            {selectedOrder ? (
              <Card className="p-4 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Order Total</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${orders.find((o: any) => o.id === selectedOrder)?.totalPrice || "0.00"}
                  </p>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Order Items</p>
                  <p className="text-sm text-muted-foreground">Items will be displayed here</p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2">📍 Location Sharing</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
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
