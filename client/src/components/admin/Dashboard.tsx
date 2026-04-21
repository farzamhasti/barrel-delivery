import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package2, Truck, TrendingUp, MapPin, Eye, EyeOff, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";

const FORT_ERIE_CENTER = { lat: 42.905191, lng: -78.9225479 };
const RESTAURANT_ADDRESS = { lat: 42.905191, lng: -78.9225479 };

export default function Dashboard() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const { data: orders = [] } = trpc.orders.list.useQuery();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.getTodayOrdersWithItems.useQuery();
  
  const { data: selectedOrderData } = trpc.orders.getById.useQuery(
    { orderId: selectedOrderId! },
    { enabled: !!selectedOrderId }
  );

  // Filter orders for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter((o: any) => {
    const orderDate = new Date(o.createdAt);
    orderDate.setHours(0, 0, 0, 0);
    return orderDate.getTime() === today.getTime();
  });

  const pendingOrders = todayOrders.filter((o: any) => o.status === "Pending").length;
  const onTheWayOrders = todayOrders.filter((o: any) => o.status === "On the Way").length;
  const deliveredOrders = todayOrders.filter((o: any) => o.status === "Delivered").length;

  // Filter to active orders for map
  const activeOrders = Array.isArray(allOrders) ? allOrders.filter((o: any) =>
    ["Pending", "Ready", "On the Way"].includes(o.status)
  ) : [];

  // Auto-refetch every 5 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Update map markers when orders change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add markers for each order
    activeOrders.forEach((order: any) => {
      if (order.customer?.latitude && order.customer?.longitude) {
        const marker = new google.maps.Marker({
          map: mapRef.current,
          position: {
            lat: parseFloat(order.customer.latitude as any),
            lng: parseFloat(order.customer.longitude as any),
          },
          title: `Order #${order.id}`,
          label: {
            text: `#${order.id}`,
            color: "white",
            fontSize: "14px",
            fontWeight: "bold",
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 16,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 2,
          },
        });

        marker.addListener("click", () => {
          setSelectedOrderId(order.id);
        });

        markersRef.current.push(marker);
      }
    });
  }, [activeOrders]);

  // Update map when selected order changes
  useEffect(() => {
    if (!mapRef.current || !selectedOrderId) return;

    const selectedOrder = activeOrders.find((o: any) => o.id === selectedOrderId);
    if (!selectedOrder || !selectedOrder.customer?.latitude || !selectedOrder.customer?.longitude) return;

    const position = {
      lat: parseFloat(selectedOrder.customer.latitude as any),
      lng: parseFloat(selectedOrder.customer.longitude as any),
    };

    mapRef.current.panTo(position);
    mapRef.current.setZoom(16);

    // Highlight selected marker
    markersRef.current.forEach((marker, idx) => {
      const order = activeOrders[idx];
      if (order.id === selectedOrderId) {
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 20,
          fillColor: "#dc2626",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 3,
        });
        marker.setZIndex(100);
      } else {
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 16,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 2,
        });
        marker.setZIndex(1);
      }
    });

    setTimeout(() => {
      if (mapRef.current) {
        google.maps.event.trigger(mapRef.current, 'resize');
      }
    }, 0);
  }, [selectedOrderId, activeOrders]);

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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Pending": return "bg-yellow-100 text-yellow-800";
      case "On the Way": return "bg-blue-100 text-blue-800";
      case "Delivered": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stat Cards - Removed Active Drivers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <StatCard icon={<Package2 className="w-6 h-6" />} label="Pending" value={pendingOrders} color="bg-yellow-100 text-yellow-700" />
        <StatCard icon={<Truck className="w-6 h-6" />} label="On the Way" value={onTheWayOrders} color="bg-blue-100 text-blue-700" />
        <StatCard icon={<TrendingUp className="w-6 h-6" />} label="Delivered" value={deliveredOrders} color="bg-green-100 text-green-700" />
      </div>

      {/* Map Section with Order Tracking */}
      <div className="space-y-4">
        {/* Map Toggle */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold text-foreground">Order Tracking Map</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMap(!showMap)}
            className="gap-2"
          >
            {showMap ? (
              <>
                <EyeOff className="w-4 h-4" />
                Hide Map
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Show Map
              </>
            )}
          </Button>
        </div>

        {/* Map and Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          {showMap && (
            <div className="lg:col-span-2">
              <Card className="overflow-hidden h-96 lg:h-full">
                <MapView
                  initialCenter={FORT_ERIE_CENTER}
                  initialZoom={14}
                  onMapReady={(map) => {
                    mapRef.current = map;

                    // Add restaurant marker
                    new google.maps.Marker({
                      map,
                      position: RESTAURANT_ADDRESS,
                      title: "Restaurant",
                      label: {
                        text: "🍽️",
                        fontSize: "18px",
                      },
                      icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 18,
                        fillColor: "#ef4444",
                        fillOpacity: 1,
                        strokeColor: "white",
                        strokeWeight: 3,
                      },
                    });
                  }}
                />
              </Card>
            </div>
          )}

          {/* Active Orders on Right */}
          <div className={`${showMap ? "lg:col-span-1" : "lg:col-span-3"}`}>
            <Card className="p-4 md:p-6 h-96 lg:h-full flex flex-col">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex-shrink-0">Active Orders ({activeOrders?.length || 0})</h3>

              {isLoading ? (
                <div className="flex items-center justify-center py-8 flex-1">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                </div>
              ) : !activeOrders || activeOrders.length === 0 ? (
                <div className="text-center flex-1 flex items-center justify-center">
                  <p className="text-muted-foreground">No active orders</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto flex-1">
                  {activeOrders.map((order: any) => (
                    <Card
                      key={order.id}
                      className={`p-3 cursor-pointer transition-all border-2 ${
                        selectedOrderId === order.id
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-accent/50"
                      }`}
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">Order #{order.id}</h4>
                          <p className="text-xs text-muted-foreground">{order.customer?.name}</p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>

                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <p className="line-clamp-2">
                          {order.customerAddress || order.customer?.address}
                        </p>
                      </div>

                      {selectedOrderId === order.id && selectedOrderData && (
                        <div className="border-t border-border pt-2 mt-2">
                          <div className="space-y-1 text-xs">
                            <div>
                              <p className="text-muted-foreground">Items:</p>
                              {selectedOrderData.items?.length ? (
                                <ul className="text-foreground space-y-0.5">
                                  {selectedOrderData.items.map((item: any, idx: number) => (
                                    <li key={idx}>
                                      {item.quantity}x {item.menuItemName}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-muted-foreground">No items</p>
                              )}
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total: ${(Number(selectedOrderData.totalPrice) || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Today's Orders Table Below Map */}
      <Card className="p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4">Today's Orders</h2>
        {todayOrders.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No orders today</p>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Order ID</th>
                  <th className="text-left py-3 px-4 font-semibold">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-right py-3 px-4 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {todayOrders.slice(0, 10).map((order: any) => (
                  <tr key={order.id} className="border-b border-border hover:bg-muted/30">
                    <td className="py-3 px-4">#{order.id}</td>
                    <td className="py-3 px-4">{order.customer?.name}</td>
                    <td className="py-3 px-4"><Badge className={getStatusBadgeClass(order.status)}>{order.status}</Badge></td>
                    <td className="py-3 px-4 text-right">${order.totalPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card className="p-4 md:p-6">
      <div className={`w-10 md:w-12 h-10 md:h-12 rounded-lg ${color} flex items-center justify-center mb-3 md:mb-4`}><span className="w-5 md:w-6 h-5 md:h-6 flex items-center justify-center">{icon}</span></div>
      <p className="text-xs md:text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl md:text-3xl font-bold">{value}</p>
    </Card>
  );
}
