import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Eye, EyeOff, Clock, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { invalidateOrderCache } from "@/lib/invalidation";
import { MapView } from "@/components/Map";
import { DriverSelectionModal } from "@/components/DriverSelectionModal";


const FORT_ERIE_CENTER = { lat: 42.905191, lng: -78.9225479 };
const RESTAURANT_ADDRESS = { lat: 42.905191, lng: -78.9225479 }; // 224 Garrison Rd, Fort Erie, ON L2A 1M7

export default function OrderTrackingWithMap() {
  const utils = trpc.useUtils();

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<number | null>(null);
  const [driverReturnTimes, setDriverReturnTimes] = useState<Record<number, string>>({});
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Poll for return time updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setDriverReturnTimes((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((driverId) => {
          const time = updated[parseInt(driverId)];
          if (time && time !== "00:00") {
            const [minutes, seconds] = time.split(":").map(Number);
            let totalSeconds = minutes * 60 + seconds - 1;
            if (totalSeconds < 0) totalSeconds = 0;
            const newMinutes = Math.floor(totalSeconds / 60);
            const newSeconds = totalSeconds % 60;
            updated[parseInt(driverId)] = `${String(newMinutes).padStart(2, "0")}:${String(newSeconds).padStart(2, "0")}`;
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch today's orders with items for complete data
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.getTodayOrdersWithItems.useQuery();
  
  // Fetch drivers for Active Drivers section
  const { data: drivers = [], isLoading: driversLoading } = trpc.drivers.list.useQuery();
  const activeDrivers = drivers.filter((d: any) => d.status === "online" && d.isActive);

  // Fetch selected order with items
  const { data: selectedOrderData } = trpc.orders.getById.useQuery(
    { orderId: selectedOrderId! },
    { enabled: !!selectedOrderId }
  );

  // Filter to active orders
  const orders = Array.isArray(allOrders) ? allOrders.filter((o: any) =>
    ["Pending", "Ready", "On the Way"].includes(o.status)
  ) : [];

  // Auto-refetch every 5 seconds for real-time updates
  // Also listen for cache invalidation from other components
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Note: Cache invalidation from Orders tab mutations will trigger
  // automatic refetch through React Query's cache mechanism

  // Update map markers when orders change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add markers for each order
    orders.forEach((order: any) => {
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
  }, [orders]);

  // Update map when selected order changes
  useEffect(() => {
    if (!mapRef.current || !selectedOrderId) return;

    // Find the selected order
    const selectedOrder = orders.find((o: any) => o.id === selectedOrderId);
    if (!selectedOrder || !selectedOrder.customer?.latitude || !selectedOrder.customer?.longitude) return;

    // Pan and zoom to selected order
    const position = {
      lat: parseFloat(selectedOrder.customer.latitude as any),
      lng: parseFloat(selectedOrder.customer.longitude as any),
    };

    mapRef.current.panTo(position);
    mapRef.current.setZoom(16);

    // Highlight selected marker by changing its color
    markersRef.current.forEach((marker, idx) => {
      const order = orders[idx];
      if (order.id === selectedOrderId) {
        // Highlight selected marker
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
        // Reset other markers
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

    // Force map to redraw by triggering resize events
    setTimeout(() => {
      if (mapRef.current) {
        google.maps.event.trigger(mapRef.current, 'resize');
      }
    }, 0);

    setTimeout(() => {
      if (mapRef.current) {
        google.maps.event.trigger(mapRef.current, 'resize');
      }
    }, 50);

    setTimeout(() => {
      if (mapRef.current) {
        google.maps.event.trigger(mapRef.current, 'resize');
      }
    }, 150);
  }, [selectedOrderId, orders]);

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
    <div className="flex flex-col h-full space-y-6">
      {/* Map Toggle */}
      <div className="flex items-center justify-between flex-shrink-0">
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

      <div className="flex flex-col gap-6 flex-1 overflow-hidden">
        {/* Map and Drivers Side-by-Side */}
        {showMap && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96 overflow-hidden">
            {/* Map Section - 2/3 width */}
            <div className="lg:col-span-2 flex flex-col overflow-hidden">
              <Card className="overflow-hidden flex-1">
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
            
            {/* Active Drivers Section - 1/3 width */}
            <div className="flex flex-col overflow-hidden">
              <Card className="overflow-hidden flex-1 flex flex-col">
                <div className="p-4 border-b border-border flex-shrink-0">
                  <h3 className="text-lg font-semibold text-foreground">Active Drivers ({activeDrivers.filter((d: any) => d.status === "online").length})</h3>
                </div>
                
                {driversLoading ? (
                  <div className="flex items-center justify-center py-8 flex-1">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                  </div>
                ) : activeDrivers.length === 0 ? (
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
                            <td className="py-2 px-3 font-mono">
                              {driverReturnTimes[driver.id] || "00:00"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* Orders List */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border flex-shrink-0">
            <h3 className="text-lg font-semibold text-foreground">Active Orders ({orders.length})</h3>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8 flex-1">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-6 text-center flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">No active orders</p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              <div className="space-y-2 p-4">
                {orders.map((order: any) => (
                  <div
                    key={order.id}
                    className={`p-3 border rounded-lg cursor-pointer transition ${
                      selectedOrderId === order.id
                        ? "bg-blue-50 border-blue-500 shadow-md"
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-foreground">Order #{order.id}</p>
                        <p className="text-sm text-muted-foreground">{order.customerName}</p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{order.customerAddress}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Driver Selection Modal */}
      {showDriverModal && orderToAssign && (
        <DriverSelectionModal
          isOpen={showDriverModal}
          orderId={orderToAssign}
          onClose={() => {
            setShowDriverModal(false);
            setOrderToAssign(null);
          }}
          onAssign={() => {
            setShowDriverModal(false);
            setOrderToAssign(null);
            utils.orders.getTodayOrdersWithItems.invalidate();
          }}
        />
      )}
    </div>
  );
}
