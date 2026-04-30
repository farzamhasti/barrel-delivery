import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapView } from "@/components/Map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDriverReturnTime } from "@/contexts/DriverReturnTimeContext";

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
  const [activeTab, setActiveTab] = useState("pending");
  const [geocodedLocations, setGeocodedLocations] = useState<{ [key: number]: { lat: number; lng: number } }>({});
  const [failedGeocodings, setFailedGeocodings] = useState<Set<number>>(new Set());
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const restaurantMarkerRef = useRef<google.maps.Marker | null>(null);
  const isMountedRef = useRef(true);
  const geocodingQueueRef = useRef<number[]>([]);
  const geocodingInProgressRef = useRef<Set<number>>(new Set());

  // Geocoding mutation
  const geocodeMutation = (trpc as any).maps.geocode.useMutation();

  // Fetch today's orders with items for complete data
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.getTodayWithItems.useQuery(undefined, { enabled: !!user });
  
  // Fetch drivers for Active Drivers section with real-time polling (3-second interval)
  const { data: drivers = [], isLoading: driversLoading } = trpc.drivers.list.useQuery(undefined, { 
    enabled: !!user,
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
  });
  const activeDrivers = drivers.filter((d: any) => d.status === "online" && d.isActive);

  // Mutation to toggle driver status
  const setDriverStatusMutation = trpc.drivers.setStatus.useMutation({
    onSuccess: () => {
      utils.drivers.list.invalidate();
    },
  });

  // Fetch selected order from allOrders
  const selectedOrderData = selectedOrderId && Array.isArray(allOrders)
    ? allOrders.find((o: any) => o.id === selectedOrderId)
    : null;

  // Filter orders by status
  const pendingOrders = Array.isArray(allOrders) ? allOrders.filter((o: any) => o.status === "Pending") : [];
  const readyOrders = Array.isArray(allOrders) ? allOrders.filter((o: any) => o.status === "Ready") : [];
  const onTheWayOrders = Array.isArray(allOrders) ? allOrders.filter((o: any) => o.status === "On the Way") : [];
  const deliveredOrders = Array.isArray(allOrders) ? allOrders.filter((o: any) => o.status === "Delivered") : [];
  
  // All active orders for map (exclude Delivered)
  const orders = Array.isArray(allOrders) ? allOrders.filter((o: any) =>
    ["Pending", "Ready", "On the Way"].includes(o.status)
  ) : [];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Process geocoding queue with rate limiting (1 request per 500ms)
  useEffect(() => {
    const processQueue = async () => {
      while (geocodingQueueRef.current.length > 0 && geocodingInProgressRef.current.size < 1) {
        const orderId = geocodingQueueRef.current.shift();
        if (!orderId || geocodingInProgressRef.current.has(orderId)) continue;

        const order = orders.find((o: any) => o.id === orderId);
        if (!order || geocodedLocations[orderId] || failedGeocodings.has(orderId)) continue;

        geocodingInProgressRef.current.add(orderId);

        try {
          const result = await geocodeMutation.mutateAsync({ address: order.customerAddress || "" });
          
          if (isMountedRef.current && result && typeof result.lat === "number" && typeof result.lng === "number") {
            setGeocodedLocations((prev) => ({
              ...prev,
              [orderId]: { lat: result.lat, lng: result.lng },
            }));

            // Add marker to map if map is ready
            if (mapRef.current && markersRef.current) {
              const marker = new google.maps.Marker({
                map: mapRef.current,
                position: { lat: result.lat, lng: result.lng },
                title: `Order #${order.orderNumber}`,
                label: {
                  text: "📦",
                  fontSize: "16px",
                },
              });
              markersRef.current.push(marker);
            }
          } else {
            setFailedGeocodings((prev) => new Set(prev).add(orderId));
          }
        } catch (error) {
          setFailedGeocodings((prev) => new Set(prev).add(orderId));
        } finally {
          geocodingInProgressRef.current.delete(orderId);
        }
      }
    };

    const interval = setInterval(processQueue, 500);
    return () => clearInterval(interval);
  }, [orders, geocodedLocations, failedGeocodings, geocodeMutation]);

  // Queue orders for geocoding when they change
  useEffect(() => {
    orders.forEach((order: any) => {
      if (!geocodedLocations[order.id] && !failedGeocodings.has(order.id) && !geocodingQueueRef.current.includes(order.id)) {
        geocodingQueueRef.current.push(order.id);
      }
    });
  }, [orders, geocodedLocations, failedGeocodings]);

  const assignDriverMutation = trpc.orders.sendToDriver.useMutation();

  const handleSendToDriver = async (orderId: number, driverId: number) => {
    try {
      await assignDriverMutation.mutateAsync({ orderId, driverId });
      await utils.orders.getTodayWithItems.invalidate();
      setShowDriverModal(false);
      setOrderToAssign(null);
    } catch (error) {
      console.error("Failed to assign driver:", error);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <div className="flex gap-4 flex-1">
        {/* Map Section */}
        {showMap && (
          <div className="flex-1 rounded-lg overflow-hidden border border-border">
            <MapView
              initialCenter={FORT_ERIE_CENTER}
              initialZoom={13}
              onMapReady={(map) => {
                mapRef.current = map;
                
                // Add restaurant marker only once
                if (!restaurantMarkerRef.current) {
                  restaurantMarkerRef.current = new google.maps.Marker({
                    map,
                    position: RESTAURANT_ADDRESS,
                    title: "Restaurant",
                    icon: {
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 14,
                      fillColor: "#ef4444",
                      fillOpacity: 1,
                      strokeColor: "white",
                      strokeWeight: 2,
                    },
                  });
                }
              }}
            />
          </div>
        )}

        {/* Active Drivers Section - Right Side */}
        <div className="w-80 flex flex-col overflow-hidden">
          <Card className="overflow-hidden flex-1 flex flex-col">
            <div className="p-4 border-b border-border flex-shrink-0">
              <h3 className="text-lg font-semibold text-foreground">Active Drivers ({activeDrivers.length})</h3>
            </div>
            
            {activeDrivers.length === 0 ? (
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
                          <Button
                            size="sm"
                            variant={driver.status === "online" ? "default" : "outline"}
                            onClick={() => setDriverStatusMutation.mutate({ id: driver.id, status: driver.status === "online" ? "offline" : "online" })}
                            disabled={setDriverStatusMutation.isPending}
                            className="text-xs"
                          >
                            {driver.status === "online" ? "Online" : "Offline"}
                          </Button>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground font-mono">
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

      {/* Orders Section */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
            <TabsTrigger value="ready">Ready ({readyOrders.length})</TabsTrigger>
            <TabsTrigger value="on-way">On Way ({onTheWayOrders.length})</TabsTrigger>
            <TabsTrigger value="delivered">Delivered ({deliveredOrders.length})</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="pending" className="space-y-3">
              {pendingOrders.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No pending orders</div>
              ) : (
                pendingOrders.map((order: any) => (
                  <Card key={order.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedOrderId(order.id)}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">Order #{order.orderNumber}</div>
                        <div className="text-sm text-muted-foreground">{order.customerAddress}</div>
                      </div>
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); setOrderToAssign(order.id); setShowDriverModal(true); }}>
                        Assign
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="ready" className="space-y-3">
              {readyOrders.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No ready orders</div>
              ) : (
                readyOrders.map((order: any) => (
                  <Card key={order.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedOrderId(order.id)}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">Order #{order.orderNumber}</div>
                        <div className="text-sm text-muted-foreground">{order.customerAddress}</div>
                      </div>
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); setOrderToAssign(order.id); setShowDriverModal(true); }}>
                        Send
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="on-way" className="space-y-3">
              {onTheWayOrders.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No orders on the way</div>
              ) : (
                onTheWayOrders.map((order: any) => (
                  <Card key={order.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedOrderId(order.id)}>
                    <div className="font-semibold">Order #{order.orderNumber}</div>
                    <div className="text-sm text-muted-foreground">{order.customerAddress}</div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="delivered" className="space-y-3">
              {deliveredOrders.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No delivered orders</div>
              ) : (
                deliveredOrders.map((order: any) => (
                  <Card key={order.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedOrderId(order.id)}>
                    <div className="font-semibold">Order #{order.orderNumber}</div>
                    <div className="text-sm text-muted-foreground">{order.customerAddress}</div>
                  </Card>
                ))
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Driver Assignment Modal */}
      <Dialog open={showDriverModal} onOpenChange={setShowDriverModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Driver</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {activeDrivers.map((driver: any) => (
              <Button
                key={driver.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  if (orderToAssign) {
                    handleSendToDriver(orderToAssign, driver.id);
                  }
                }}
              >
                {driver.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
