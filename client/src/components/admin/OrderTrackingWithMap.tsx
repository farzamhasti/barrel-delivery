import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Eye, EyeOff, Clock, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { invalidateOrderCache } from "@/lib/invalidation";
import { MapView } from "@/components/Map";
import { DriverSelectionModal } from "@/components/DriverSelectionModal";
import { useDriverReturnTime } from "@/contexts/DriverReturnTimeContext";
import { useAuth } from "@/_core/hooks/useAuth";


const FORT_ERIE_CENTER = { lat: 42.905191, lng: -78.9225479 };
const RESTAURANT_ADDRESS = { lat: 42.905191, lng: -78.9225479 }; // 224 Garrison Rd, Fort Erie, ON L2A 1M7

export default function OrderTrackingWithMap() {
  const utils = trpc.useUtils();
  const { driverReturnTimes } = useDriverReturnTime();
  const { user } = useAuth();

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<number | null>(null);
  const [geocodedLocations, setGeocodedLocations] = useState<{ [key: number]: { lat: number; lng: number } }>({});
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const isMountedRef = useRef(true);

  // Geocoding mutation
  const geocodeMutation = (trpc as any).maps.geocode.useMutation();

  // Fetch today's orders with items for complete data
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.getTodayWithItems.useQuery(undefined, { enabled: !!user });
  
  // Fetch drivers for Active Drivers section
  const { data: drivers = [], isLoading: driversLoading } = trpc.drivers.list.useQuery(undefined, { enabled: !!user });
  const activeDrivers = drivers.filter((d: any) => d.status === "online" && d.isActive);

  // Fetch selected order from allOrders
  const selectedOrderData = selectedOrderId && Array.isArray(allOrders)
    ? allOrders.find((o: any) => o.id === selectedOrderId)
    : null;

  // Filter to active orders
  const orders = Array.isArray(allOrders) ? allOrders.filter((o: any) =>
    ["Pending", "Ready", "On the Way"].includes(o.status)
  ) : [];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-refetch every 5 seconds for real-time updates
  // Also listen for cache invalidation from other components
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Geocode all active orders
  useEffect(() => {
    if (!Array.isArray(orders) || orders.length === 0) return;

    orders.forEach((order: any) => {
      // Skip if already geocoded
      if (geocodedLocations[order.id]) return;

      // Skip if no address
      if (!order.customerAddress) return;

      // Geocode the address
      geocodeMutation.mutate(
        { address: order.customerAddress },
        {
          onSuccess: (result: any) => {
            if (!isMountedRef.current) return;
            if (result && typeof result.latitude === 'number' && typeof result.longitude === 'number') {
              setGeocodedLocations(prev => ({
                ...prev,
                [order.id]: { lat: result.latitude, lng: result.longitude }
              }));
            }
          },
        }
      );
    });
  }, [orders, geocodedLocations, geocodeMutation]);

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
      // Use geocoded location or customer coordinates
      const location = geocodedLocations[order.id] || 
        (order.customer?.latitude && order.customer?.longitude ? {
          lat: parseFloat(order.customer.latitude as any),
          lng: parseFloat(order.customer.longitude as any),
        } : null);

      if (location) {
        const marker = new google.maps.Marker({
          map: mapRef.current,
          position: location,
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
  }, [orders, geocodedLocations]);

  // Update map when selected order changes
  useEffect(() => {
    if (!mapRef.current || !selectedOrderId) return;

    // Find the selected order
    const selectedOrder = orders.find((o: any) => o.id === selectedOrderId);
    // Customer location not available in new schema - skip map navigation
    if (!selectedOrder) return;

    // Pan and zoom to selected order (location data not available)
    // TODO: Implement location-based navigation when available
    highlightSelectedMarker();
  }, [selectedOrderId, orders]);

  const highlightSelectedMarker = () => {
    if (!selectedOrderId) return;
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
                            <td className="py-2 px-3 text-muted-foreground font-mono">{driverReturnTimes[driver.id] || "00:00"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}        {/* Orders List - Below Map */}
        <div className="flex flex-col overflow-hidden flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex-shrink-0">Active Orders ({orders?.length || 0})</h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-8 flex-1">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
          ) : !orders || orders.length === 0 ? (
            <Card className="p-6 text-center flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">No active orders</p>
            </Card>
          ) : (
            <div className="space-y-3 overflow-y-auto flex-1">
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
                  <div className="space-y-3">
                    {/* Check Number */}
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Check Number</p>
                      <p className="font-semibold text-foreground text-lg">#{order.orderNumber}</p>
                    </div>

                    {/* Address */}
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Address</p>
                      <p className="text-sm text-foreground">{order.customerAddress || order.customer?.address}</p>
                    </div>

                    {/* Area */}
                    {order.area && (
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold">Area</p>
                        <p className="font-semibold text-accent">{order.area}</p>
                      </div>
                    )}

                    {/* Contact Number */}
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Contact Number</p>
                      <p className="text-sm text-foreground">{order.customerPhone}</p>
                    </div>
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
                          <p className="text-muted-foreground">Total: ${(Number(selectedOrderData.totalPrice) || 0).toFixed(2)}</p>
                        </div>
                        {selectedOrderData && selectedOrderData.area && (
                          <div>
                            <p className="text-muted-foreground">Area: <span className="font-semibold text-accent">{selectedOrderData.area}</span></p>
                          </div>
                        )}
                        {selectedOrderData && (
                          <div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Expected Delivery
                            </div>
                            <div className="font-semibold text-foreground">
                              {selectedOrderData.deliveryTime ? new Date(selectedOrderData.deliveryTime).toLocaleString() : 'N/A'}
                            </div>
                          </div>
                        )}


                        {/* Notes field removed from new schema */}
                        <div className="pt-3 border-t border-border mt-3">
                          <Button
                            onClick={() => {
                              setOrderToAssign(order.id);
                              setShowDriverModal(true);
                            }}
                            className="w-full bg-accent hover:bg-accent/90 text-white flex items-center justify-center gap-2"
                          >
                            <Send className="w-4 h-4" />
                            Send to Driver
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>


      {orderToAssign && (
        <DriverSelectionModal
          isOpen={showDriverModal}
          orderId={orderToAssign}
          onClose={() => {
            setShowDriverModal(false);
            setOrderToAssign(null);
          }}
          onAssign={() => {
            refetch();
            utils.orders.getTodayWithItems.invalidate();
          }}
        />
      )}
    </div>
  );
}
