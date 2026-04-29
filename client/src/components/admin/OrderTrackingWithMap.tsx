"use client";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const restaurantMarkerRef = useRef<google.maps.Marker | null>(null);
  const isMountedRef = useRef(true);
  const geocodingQueueRef = useRef<number[]>([]);
  const geocodingInProgressRef = useRef<Set<number>>(new Set());
  const mapInitializedRef = useRef(false);

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

  // Initialize map only once when mapRef is set
  useEffect(() => {
    if (!mapRef.current || mapInitializedRef.current) return;
    
    mapInitializedRef.current = true;
    mapRef.current.setCenter(FORT_ERIE_CENTER);
    mapRef.current.setZoom(13);

    // Add restaurant marker only once
    if (!restaurantMarkerRef.current) {
      restaurantMarkerRef.current = new google.maps.Marker({
        map: mapRef.current,
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
  }, []);

  // Auto-refetch disabled to prevent map blinking - use manual refresh instead
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     refetch();
  //   }, 5000);
  //   return () => clearInterval(interval);
  // }, [refetch]);

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

        if (isMountedRef.current && result) {
          const { lat, lng, error } = result as any;
          if (!error && lat && lng && typeof lat === 'number' && typeof lng === 'number') {
            setGeocodedLocations((prev) => ({
              ...prev,
              [orderId]: { lat, lng },
            }));
          } else {
            throw new Error('Invalid geocoding result');
          }
        }
      } catch (error) {
        if (isMountedRef.current) {
          setFailedGeocodings((prev) => {
            const newSet = new Set(prev);
            newSet.add(orderId);
            return newSet;
          });
        }
      } finally {
        geocodingInProgressRef.current.delete(orderId);
        setTimeout(processQueue, 500);
      }
    };

    processQueue();
  }, [orders, geocodeMutation]);

  // Update map markers when geocoded locations change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Add new markers for geocoded locations
    Object.entries(geocodedLocations).forEach(([orderId, location]) => {
      const order = orders.find((o: any) => o.id === parseInt(orderId));
      if (!order) return;

      const marker = new google.maps.Marker({
        map: mapRef.current,
        position: location,
        title: `Order #${order.orderNumber}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor:
            order.status === "Pending"
              ? "#eab308"
              : order.status === "Ready"
                ? "#22c55e"
                : "#3b82f6",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 2,
        },
      });

      marker.addListener("click", () => {
        setSelectedOrderId(order.id);
      });

      markersRef.current.push(marker);
    });
  }, [geocodedLocations, orders]);

  // Queue orders for geocoding
  useEffect(() => {
    orders.forEach((order: any) => {
      if (order.customerAddress && !geocodingQueueRef.current.includes(order.id) && 
        !geocodedLocations[order.id] &&
        !failedGeocodings.has(order.id) &&
        !geocodingInProgressRef.current.has(order.id)
      ) {
        geocodingQueueRef.current.push(order.id);
      }
    });
  }, [orders, geocodedLocations, failedGeocodings]);

  const handleSendToDriver = async (orderId: number) => {
    setOrderToAssign(orderId);
    setShowDriverModal(true);
  };

  const handleAssignDriver = async (driverId: number) => {
    if (!orderToAssign) return;
    try {
      await (trpc.orders.assignDriver as any).mutate({
        orderId: orderToAssign,
        driverId,
      });
      invalidateOrderCache(utils);
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
    <div className="flex flex-col h-full gap-4">
      {/* Top Section: Map and Active Drivers */}
      <div className="flex gap-4 flex-1">
        {/* Map Section */}
        {showMap && (
          <div className="flex-1 rounded-lg overflow-hidden border border-border">
            <MapView
              onMapReady={(map) => {
                mapRef.current = map;
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
            
            {driversLoading ? (
              <div className="p-4 text-xs text-muted-foreground">Loading drivers...</div>
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

      {/* Bottom Section: Status Tabs */}
      <div className="border border-border rounded-lg p-4 bg-background">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 text-xs h-auto mb-4">
            <TabsTrigger value="pending" className="text-xs py-2">Pending ({pendingOrders.length})</TabsTrigger>
            <TabsTrigger value="ready" className="text-xs py-2">Ready ({readyOrders.length})</TabsTrigger>
            <TabsTrigger value="on-way" className="text-xs py-2">On Way ({onTheWayOrders.length})</TabsTrigger>
            <TabsTrigger value="delivered" className="text-xs py-2">Delivered ({deliveredOrders.length})</TabsTrigger>
          </TabsList>

          {/* Orders List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8 col-span-full">Loading orders...</div>
            ) : (
              <>
                <TabsContent value="pending" className="space-y-2 mt-0 col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingOrders.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 col-span-full">No pending orders</div>
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

                <TabsContent value="ready" className="space-y-2 mt-0 col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {readyOrders.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 col-span-full">No ready orders</div>
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

                <TabsContent value="on-way" className="space-y-2 mt-0 col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {onTheWayOrders.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 col-span-full">No orders on the way</div>
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

                <TabsContent value="delivered" className="space-y-2 mt-0 col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deliveredOrders.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 col-span-full">No delivered orders</div>
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
      </div>

      {/* Driver Selection Modal */}
      {orderToAssign && (
        <DriverSelectionModal
          isOpen={showDriverModal}
          orderId={orderToAssign}
          onClose={() => setShowDriverModal(false)}
          onAssign={(driverId: number) => handleAssignDriver(driverId)}
        />
      )}
    </div>
  );
}
