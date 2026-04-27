import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Phone } from "lucide-react";
import { trpc } from "@/lib/trpc";
import MapView from "./MapView";

export default function OrderTracking() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);

  // Fetch all orders and filter on client side
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.list.useQuery();
  
  // Filter to active orders
  const orders = allOrders.filter((o: any) => 
    ["preparing", "ready", "on_the_way"].includes(o.status)
  );

  // Auto-refetch every 5 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  const selectedOrder = orders.find((o: any) => o.id === selectedOrderId) as any;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "preparing":
        return "bg-yellow-100 text-yellow-800";
      case "ready":
        return "bg-blue-100 text-blue-800";
      case "on_the_way":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Order Tracking</h2>
        <p className="text-muted-foreground mt-1">Monitor active orders in real-time</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Active Orders</CardTitle>
              <CardDescription>{orders.length} orders in progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="text-center text-muted-foreground py-8">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No active orders</div>
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
                          <div className="text-sm text-muted-foreground truncate">{order.customerAddress}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                              {order.status.replace("_", " ").toUpperCase()}
                            </Badge>
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

        {/* Order Details and Map */}
        <div className="lg:col-span-2 space-y-6">
          {selectedOrder ? (
            <>
              {/* Order Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Order #{selectedOrder.id}</CardTitle>
                  <CardDescription>
                    <Badge className={`mt-2 ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Customer</div>
                      <div className="font-semibold text-foreground">{selectedOrder.customerName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <div className="font-semibold text-foreground">{selectedOrder.customerPhone}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Address
                    </div>
                    <div className="font-semibold text-foreground">{selectedOrder.customerAddress}</div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground">Items</div>
                    <div className="space-y-1 mt-2">
                      {selectedOrder.orderItems?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.menuItemName}</span>
                          <span className="text-muted-foreground">${((Number(item.price) || 0) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${(Number(selectedOrder.totalPrice) || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {selectedOrder.deliveryTime && (
                    <div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Expected Delivery
                      </div>
                      <div className="font-semibold text-foreground">
                        {selectedOrder.deliveryTime ? new Date(selectedOrder.deliveryTime).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  )}

                  {selectedOrder.customerNotes && (
                    <div>
                      <div className="text-sm text-muted-foreground">Notes</div>
                      <div className="text-sm text-foreground italic">{selectedOrder.customerNotes}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Map Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={showMap ? "default" : "outline"}
                  onClick={() => setShowMap(true)}
                  className="flex-1"
                >
                  Show Map
                </Button>
                <Button
                  variant={!showMap ? "default" : "outline"}
                  onClick={() => setShowMap(false)}
                  className="flex-1"
                >
                  Hide Map
                </Button>
              </div>

              {/* Map */}
              {showMap && (
                <Card>
                  <CardHeader>
                    <CardTitle>Live Map</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px] rounded-lg overflow-hidden">
                      <MapView />
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[400px]">
                <div className="text-center text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select an order to view details and map</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
