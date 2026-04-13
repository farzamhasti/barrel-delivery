import { useState, useEffect, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";

const FORT_ERIE_CENTER = { lat: 42.8711, lng: -79.2477 };
const RESTAURANT_ADDRESS = { lat: 42.8711, lng: -79.2477 }; // 224 Garrison Rd, Fort Erie

export default function OrderTrackingWithMap() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  // Fetch all orders and filter on client side
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.list.useQuery();
  
  // Fetch selected order with items
  const { data: selectedOrderData } = trpc.orders.getById.useQuery(
    { orderId: selectedOrderId! },
    { enabled: !!selectedOrderId }
  );
  
  // Filter to active orders
  const orders = allOrders.filter((o: any) => 
    ["Pending", "Ready", "On the Way"].includes(o.status)
  );

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
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for each order
    orders.forEach((order: any) => {
      if (order.customer?.latitude && order.customer?.longitude) {
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position: {
            lat: parseFloat(order.customer.latitude as any),
            lng: parseFloat(order.customer.longitude as any),
          },
          title: `Order #${order.id}`,
          content: createMarkerContent(order),
        });

        marker.addListener("click", () => {
          setSelectedOrderId(order.id);
        });

        markersRef.current.push(marker);
      }
    });
  }, [orders]);

  const createMarkerContent = (order: any) => {
    const div = document.createElement("div");
    div.className = "flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-full font-bold text-sm cursor-pointer hover:bg-blue-600 transition-colors";
    div.textContent = `#${order.id}`;
    return div;
  };

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
    <div className="space-y-6">
      {/* Map Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Order Tracking</h2>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        {showMap && (
          <div className="lg:col-span-2">
            <Card className="overflow-hidden h-[500px]">
              <MapView
                initialCenter={FORT_ERIE_CENTER}
                initialZoom={14}
                onMapReady={(map) => {
                  mapRef.current = map;
                  
                  // Add restaurant marker
                  new google.maps.marker.AdvancedMarkerElement({
                    map,
                    position: RESTAURANT_ADDRESS,
                    title: "Restaurant",
                    content: createRestaurantMarker(),
                  });
                }}
              />
            </Card>
          </div>
        )}

        {/* Orders List */}
        <div className={showMap ? "lg:col-span-1" : "lg:col-span-3"}>
          <h3 className="text-lg font-semibold text-foreground mb-4">Active Orders ({orders.length})</h3>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
          ) : orders.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No active orders</p>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {orders.map((order: any) => (
                <Card
                  key={order.id}
                  className={`p-4 cursor-pointer transition-all border-2 ${
                    selectedOrderId === order.id
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                  onClick={() => setSelectedOrderId(order.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-foreground">Order #{order.id}</h4>
                      <p className="text-sm text-muted-foreground">{order.customer?.name}</p>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{order.customer?.address}</span>
                  </div>

                  {selectedOrderId === order.id && selectedOrderData && (
                    <div className="border-t border-border pt-3 mt-3">
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Items:</p>
                          {selectedOrderData.items?.length ? (
                            <ul className="text-foreground space-y-1">
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
                          <p className="text-muted-foreground">Total: ${selectedOrderData.totalPrice}</p>
                        </div>
                        {selectedOrderData.notes && (
                          <div>
                            <p className="text-muted-foreground">Notes: {selectedOrderData.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function createRestaurantMarker() {
  const div = document.createElement("div");
  div.className = "flex items-center justify-center w-12 h-12 bg-red-500 text-white rounded-full font-bold text-lg";
  div.innerHTML = "🍽️";
  return div;
}
