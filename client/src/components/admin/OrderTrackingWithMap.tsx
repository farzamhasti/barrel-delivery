import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Eye, EyeOff, Clock, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [activeTab, setActiveTab] = useState("pending");
  const [geocodedLocations, setGeocodedLocations] = useState<{ [key: number]: { lat: number; lng: number } }>({});
  const [failedGeocodings, setFailedGeocodings] = useState<Set<number>>(new Set());
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const isMountedRef = useRef(true);
  const geocodingQueueRef = useRef<number[]>([]);
  const geocodingInProgressRef = useRef<Set<number>>(new Set());

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

  // Auto-refetch every 5 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Process geocoding queue with rate limiting (1 request per 500ms)
  useEffect(() => {
    const processQueue = async () => {
      if (geocodingQueueRef.current.length === 0) return;

      const orderId = geocodingQueueRef.current.shift();
      if (!orderId || geocodingInProgressRef.current.has(orderId)) return;

      const order = orders.find((o: any) => o.id === orderId);
      if (!order || !order.customerAddress) return;

      geocodingInProgressRef.current.add(orderId);

      try {
        const result = await new Promise((resolve, reject) => {
          geocodeMutation.mutate(
            { address: order.customerAddress },
            {
              onSuccess: resolve,
              onError: reject,
            }
          );
        });

        if (!isMountedRef.current) return;

        if (result && typeof (result as any).latitude === 'number' && typeof (result as any).longitude === 'number' && !('error' in (result as any))) {
          setGeocodedLocations(prev => ({
            ...prev,
            [orderId]: { lat: (result as any).latitude, lng: (result as any).longitude }
          }));
        } else if (result && typeof result === 'object' && 'error' in (result as any)) {
          setFailedGeocodings(prev => new Set(prev).add(orderId));
        }
      } catch (error) {
        setFailedGeocodings(prev => new Set(prev).add(orderId));
      } finally {
        geocodingInProgressRef.current.delete(orderId);
        setTimeout(processQueue, 500);
      }
    };

    processQueue();
  }, [orders, geocodeMutation]);

  // Queue orders for geocoding
  useEffect(() => {
    orders.forEach(order => {
      if (
        order.customerAddress &&
        !geocodedLocations[order.id] &&
        !failedGeocodings.has(order.id) &&
        !geocodingInProgressRef.current.has(order.id) &&
        !geocodingQueueRef.current.includes(order.id)
      ) {
        geocodingQueueRef.current.push(order.id);
      }
    });
  }, [orders, geocodedLocations, failedGeocodings]);

  // Update map markers when orders or selected order changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers for each order
    orders.forEach((order: any) => {
      const location = geocodedLocations[order.id];
      if (location) {
        const marker = new google.maps.Marker({
          map: mapRef.current,
          position: location,
          title: `Order #${order.orderNumber}`,
          label: {
            text: order.orderNumber.toString(),
            color: "white",
            fontSize: "12px",
            fontWeight: "bold",
          },
        });
        markersRef.current.push(marker);
      }
    });

    // Update marker colors
    markersRef.current.forEach((marker, index) => {
      const orderId = orders[index]?.id;
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: orderId === selectedOrderId ? 20 : 16,
        fillColor: orderId === selectedOrderId ? "#ef4444" : "#3b82f6",
        fillOpacity: 1,
        strokeColor: "white",
        strokeWeight: 2,
      });
    });

    // Pan to selected order
    if (selectedOrderId) {
      const location = geocodedLocations[selectedOrderId];
      if (location && mapRef.current) {
        mapRef.current.panTo(location);
        mapRef.current.setZoom(16);
      }
    }
  }, [selectedOrderId, orders, geocodedLocations]);

  const handleSendToDriver = (orderId: number) => {
    setOrderToAssign(orderId);
    setShowDriverModal(true);
  };

  const handleAssignDriver = async () => {
    if (!orderToAssign) return;

    try {
      await (trpc as any).orders.assignDriver.useMutation().mutateAsync({
        orderId: orderToAssign,
      });

      await invalidateOrderCache(utils);
      setShowDriverModal(false);
      setOrderToAssign(null);
    } catch (error) {
      console.error("Error assigning driver:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-500 text-black";
      case "Ready":
        return "bg-green-500 text-white";
      case "On the Way":
        return "bg-blue-500 text-white";
      case "Delivered":
        return "bg-gray-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const OrderCard = ({ order, isSelected, onSelect, onSendToDriver }: any) => (
    <Card
      key={order.id}
      className={`p-4 cursor-pointer transition-all border-2 ${
        isSelected
          ? "border-accent bg-accent/5"
          : "border-border hover:border-accent/50"
      }`}
      onClick={() => onSelect(order.id)}
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
          <p className="text-sm text-foreground">{order.customerAddress}</p>
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

      {isSelected && selectedOrderData && (
        <div className="border-t border-border pt-3 mt-3">
          <div className="space-y-2 text-sm">
            {selectedOrderData.deliveryTime && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{new Date(selectedOrderData.deliveryTime).toLocaleTimeString()}</span>
              </div>
            )}
            <Button
              size="sm"
              className="w-full mt-2"
              onClick={() => onSendToDriver(order.id)}
            >
              <Send className="w-4 h-4 mr-2" />
              Send to Driver
            </Button>
          </div>
        </div>
      )}
    </Card>
  );

  return (
    <div className="flex gap-4 h-full">
      {/* Map Section */}
      {showMap && (
        <div className="flex-1 rounded-lg overflow-hidden border border-border">
          <MapView
            onMapReady={(map) => {
              mapRef.current = map;
              map.setCenter(FORT_ERIE_CENTER);
              map.setZoom(13);

              // Add restaurant marker
              new google.maps.Marker({
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
            }}
          />
        </div>
      )}

      {/* Orders List Section */}
      <div className="w-80 flex flex-col gap-4">
        {/* Toggle Map Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMap(!showMap)}
          className="w-full"
        >
          {showMap ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
          {showMap ? "Hide Map" : "Show Map"}
        </Button>

        {/* Status Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1">
          <TabsList className="grid w-full grid-cols-4 text-xs h-auto">
            <TabsTrigger value="pending" className="text-xs py-2">Pending ({pendingOrders.length})</TabsTrigger>
            <TabsTrigger value="ready" className="text-xs py-2">Ready ({readyOrders.length})</TabsTrigger>
            <TabsTrigger value="on-way" className="text-xs py-2">On Way ({onTheWayOrders.length})</TabsTrigger>
            <TabsTrigger value="delivered" className="text-xs py-2">Delivered ({deliveredOrders.length})</TabsTrigger>
          </TabsList>

          {/* Orders List */}
          <div className="flex-1 overflow-y-auto space-y-2 mt-4">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">Loading orders...</div>
            ) : (
              <>
                <TabsContent value="pending" className="space-y-2 mt-0">
                  {pendingOrders.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No pending orders</div>
                  ) : (
                    pendingOrders.map((order: any) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        isSelected={selectedOrderId === order.id}
                        onSelect={setSelectedOrderId}
                        onSendToDriver={handleSendToDriver}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="ready" className="space-y-2 mt-0">
                  {readyOrders.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No ready orders</div>
                  ) : (
                    readyOrders.map((order: any) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        isSelected={selectedOrderId === order.id}
                        onSelect={setSelectedOrderId}
                        onSendToDriver={handleSendToDriver}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="on-way" className="space-y-2 mt-0">
                  {onTheWayOrders.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No orders on the way</div>
                  ) : (
                    onTheWayOrders.map((order: any) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        isSelected={selectedOrderId === order.id}
                        onSelect={setSelectedOrderId}
                        onSendToDriver={handleSendToDriver}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="delivered" className="space-y-2 mt-0">
                  {deliveredOrders.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No delivered orders</div>
                  ) : (
                    deliveredOrders.map((order: any) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        isSelected={selectedOrderId === order.id}
                        onSelect={setSelectedOrderId}
                        onSendToDriver={handleSendToDriver}
                      />
                    ))
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        {/* Active Drivers Section */}
        <div className="border-t border-border pt-4">
          <h3 className="font-semibold text-sm mb-2">Active Drivers</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {driversLoading ? (
              <div className="text-xs text-muted-foreground">Loading drivers...</div>
            ) : activeDrivers.length === 0 ? (
              <div className="text-xs text-muted-foreground">No active drivers</div>
            ) : (
              activeDrivers.map((driver: any) => (
                <div key={driver.id} className="text-xs p-2 bg-background rounded border border-border">
                  <div className="font-semibold">{driver.name}</div>
                  <div className="text-muted-foreground">
                    {driver.status} • Returns {driverReturnTimes[driver.id] || "N/A"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Driver Selection Modal */}
      {orderToAssign && (
        <DriverSelectionModal
          isOpen={showDriverModal}
          orderId={orderToAssign}
          onClose={() => setShowDriverModal(false)}
          onAssign={handleAssignDriver}
        />
      )}
    </div>
  );
}
