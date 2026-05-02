import { useEffect, useState, useRef } from 'react';
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useIsMobile } from "@/hooks/useMobile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapView } from "@/components/Map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDriverReturnTime } from "@/contexts/DriverReturnTimeContext";
import { Clock, CheckCircle2, Truck, Package, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { FullscreenMapModal } from "@/components/FullscreenMapModal";
import { useCountdownTimer } from "@/hooks/useCountdownTimer";

const FORT_ERIE_CENTER = { lat: 42.905191, lng: -78.9225479 };
const RESTAURANT_ADDRESS = { lat: 42.905191, lng: -78.9225479 }; // 224 Garrison Rd, Fort Erie, ON L2A 1M7

// Helper function to format return time from seconds to MM:SS format
function formatReturnTime(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Component to display a single driver with countdown timer
function DriverRowWithTimer({ driver, hasOnTheWayOrders }: { driver: any; hasOnTheWayOrders: boolean }) {
  const { displayTime } = useCountdownTimer(driver.estimatedReturnTime, driver.id);
  
  // Only show timer if driver has on_the_way orders AND has set estimated return time
  const shouldShowTimer = hasOnTheWayOrders && driver.estimatedReturnTime && driver.estimatedReturnTime > 0;
  
  return (
    <tr className="border-b border-border hover:bg-muted/30">
      <td className="py-2 px-3">{driver.name}</td>
      <td className="py-2 px-3">
        <Badge className="bg-green-100 text-green-800 text-xs">Online</Badge>
      </td>
      <td className="py-2 px-3 text-muted-foreground font-mono">
        {shouldShowTimer ? displayTime : "00:00"}
      </td>
    </tr>
  );
}

// Color scheme for order statuses
const STATUS_COLORS = {
  Pending: { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-800', tab: 'data-[state=active]:bg-gray-100' },
  Ready: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800', tab: 'data-[state=active]:bg-blue-100' },
  'On the Way': { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800', tab: 'data-[state=active]:bg-orange-100' },
  Delivered: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-800', tab: 'data-[state=active]:bg-green-100' },
};

export default function OrderTrackingWithMap() {
  const utils = trpc.useUtils();
  const { driverReturnTimes } = useDriverReturnTime();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showFullscreenMap, setShowFullscreenMap] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<number | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<{ id: number; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [geocodedLocations, setGeocodedLocations] = useState<{ [key: number]: { lat: number; lng: number } }>({});
  const [failedGeocodings, setFailedGeocodings] = useState<Set<number>>(new Set());
  const [fullscreenGeocodedLocations, setFullscreenGeocodedLocations] = useState<{ [key: number]: { lat: number; lng: number } }>({});
  const [fullscreenFailedGeocodings, setFullscreenFailedGeocodings] = useState<Set<number>>(new Set());
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const restaurantMarkerRef = useRef<google.maps.Marker | null>(null);
  const isMountedRef = useRef(true);
  const geocodingQueueRef = useRef<number[]>([]);
  const geocodingInProgressRef = useRef<Set<number>>(new Set());
  const fullscreenMapRef = useRef<google.maps.Map | null>(null);
  const fullscreenMarkersRef = useRef<google.maps.Marker[]>([]);
  const fullscreenRestaurantMarkerRef = useRef<google.maps.Marker | null>(null);
  const fullscreenGeocodingQueueRef = useRef<number[]>([]);
  const fullscreenGeocodingInProgressRef = useRef<Set<number>>(new Set());

  // Geocoding mutation
  const geocodeMutation = (trpc as any).maps.geocode.useMutation();

  // Fetch today's orders with items for complete data with faster polling (1-second interval)
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.getTodayWithItems.useQuery(undefined, { 
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache
    refetchInterval: 1000, // Poll every 1 second for near-instant updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
  
  // Fetch drivers for Active Drivers section with faster real-time polling (1-second interval)
  const { data: drivers = [], isLoading: driversLoading } = trpc.drivers.list.useQuery(undefined, { 
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache
    refetchInterval: 1000, // Poll every 1 second for near-instant updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
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

  // Get drivers with on_the_way orders
  const driversWithOnTheWayOrders = new Set(
    onTheWayOrders.map((order: any) => order.driverId)
  );
  
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
              const svgMarker = `<svg width="48" height="56" viewBox="0 0 48 56" xmlns="http://www.w3.org/2000/svg"><defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/></filter><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#60a5fa;stop-opacity:1" /><stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" /></linearGradient></defs><path d="M24 0C13.507 0 5 8.507 5 19c0 8 19 37 19 37s19-29 19-37c0-10.493-8.507-19-19-19z" fill="url(#grad)" stroke="white" stroke-width="2" filter="url(#shadow)"/><circle cx="24" cy="18" r="10" fill="white" opacity="0.95"/><text x="24" y="22" text-anchor="middle" font-size="10" font-weight="bold" fill="#3b82f6">#${order.orderNumber}</text></svg>`;
              
              const marker = new google.maps.Marker({
                map: mapRef.current,
                position: { lat: result.lat, lng: result.lng },
                title: `Order #${order.orderNumber}`,
                icon: {
                  url: `data:image/svg+xml;base64,${btoa(svgMarker)}`,
                  scaledSize: new google.maps.Size(48, 56),
                  anchor: new google.maps.Point(24, 56),
                },
              });
              
              marker.addListener('click', () => {
                setSelectedOrderId(order.id);
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

  const handleSendToDriver = async () => {
    if (!orderToAssign || !selectedDriver) return;
    try {
      const order = allOrders.find(o => o.id === orderToAssign);
      // Pass driver name instead of ID to avoid serialization issues
      console.log('[DEBUG] Assigning order to driver:', selectedDriver.name);
      await assignDriverMutation.mutateAsync({ orderId: orderToAssign, driverName: selectedDriver.name });
      await utils.orders.getTodayWithItems.invalidate();
      toast.success(`Order #${order?.orderNumber} has been sent to the driver ${selectedDriver.name}`);
      setShowDriverModal(false);
      setOrderToAssign(null);
      setSelectedDriver(null);
    } catch (error) {
      console.error("Failed to assign driver:", error);
      toast.error("Failed to send order to driver");
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Map Controls */}
      <div className="flex justify-between items-center">
        <div>
          {!isMobile && (
            <Button
              onClick={() => setShowMap(!showMap)}
              variant={showMap ? "default" : "outline"}
              size="sm"
              className="gap-2"
            >
              {showMap ? "Hide Map" : "Show Map"}
            </Button>
          )}
        </div>
        <Button
          onClick={() => setShowFullscreenMap(true)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Maximize2 className="w-4 h-4" />
          Better Map View
        </Button>
      </div>

      <div className="flex gap-4 flex-1">
        {/* Map Section - Hidden on Mobile */}
        {showMap && !isMobile && (
          <div className="flex-1 rounded-lg overflow-hidden border border-border">
            <MapView
              initialCenter={FORT_ERIE_CENTER}
              initialZoom={13}
              onMapReady={(map) => {
                mapRef.current = map;
                
                // Clear existing markers when map remounts (e.g., when toggled)
                markersRef.current.forEach((marker) => marker.setMap(null));
                markersRef.current = [];
                
                // Recreate restaurant marker
                if (restaurantMarkerRef.current) {
                  restaurantMarkerRef.current.setMap(null);
                }
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
                
                // Recreate all order markers from geocoded locations
                Object.entries(geocodedLocations).forEach(([orderId, location]) => {
                  const order = orders.find((o: any) => o.id === parseInt(orderId));
                  if (order) {
                    const svgMarker = `<svg width="48" height="56" viewBox="0 0 48 56" xmlns="http://www.w3.org/2000/svg"><defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/></filter><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#60a5fa;stop-opacity:1" /><stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" /></linearGradient></defs><path d="M24 0C13.507 0 5 8.507 5 19c0 8 19 37 19 37s19-29 19-37c0-10.493-8.507-19-19-19z" fill="url(#grad)" stroke="white" stroke-width="2" filter="url(#shadow)"/><circle cx="24" cy="18" r="10" fill="white" opacity="0.95"/><text x="24" y="22" text-anchor="middle" font-size="10" font-weight="bold" fill="#3b82f6">#${order.orderNumber}</text></svg>`;
                    
                    const marker = new google.maps.Marker({
                      map,
                      position: location,
                      title: `Order #${order.orderNumber}`,
                      icon: {
                        url: `data:image/svg+xml;base64,${btoa(svgMarker)}`,
                        scaledSize: new google.maps.Size(48, 56),
                        anchor: new google.maps.Point(24, 56),
                      },
                    });
                    
                    marker.addListener('click', () => {
                      setSelectedOrderId(order.id);
                    });
                    
                    markersRef.current.push(marker);
                  }
                });
              }}
            />
          </div>
        )}

        {/* Active Drivers Section - Right Side - Hidden on Mobile */}
        {!isMobile && (
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
                      <DriverRowWithTimer 
                        key={driver.id} 
                        driver={driver}
                        hasOnTheWayOrders={driversWithOnTheWayOrders.has(driver.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        )}
      </div>

      {/* Orders Section */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600" />
              Pending ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="ready" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Ready ({readyOrders.length})
            </TabsTrigger>
            <TabsTrigger value="on-way" className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-600" />
              On the way ({onTheWayOrders.length})
            </TabsTrigger>
            <TabsTrigger value="delivered" className="flex items-center gap-2">
              <Package className="w-4 h-4 text-green-600" />
              Delivered ({deliveredOrders.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="pending" className="space-y-3">
              {pendingOrders.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No pending orders</div>
              ) : (
                pendingOrders.map((order: any) => (
                  <Card key={order.id} className={`p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${STATUS_COLORS.Pending.bg} ${STATUS_COLORS.Pending.border}`} onClick={() => setSelectedOrderId(order.id)}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold">Order #{order.orderNumber}</div>
                        <div className="text-sm text-muted-foreground">{order.customerAddress}</div>
                        <div className="text-sm text-muted-foreground mt-1">Phone: {order.customerPhone}</div>
                        <div className="text-sm text-muted-foreground">Area: {order.area || 'N/A'}</div>
                        <div className={`text-sm font-medium ${order.driverName ? 'text-green-600' : 'text-muted-foreground'}`}>Driver: {order.driverName || 'N/A'}</div>
                        {order.deliveryTime && (
                          <div className="text-sm text-muted-foreground mt-1">Delivery Time: {new Date(order.deliveryTime).toLocaleString()}</div>
                        )}
                      </div>
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); setOrderToAssign(order.id); setShowDriverModal(true); }}>
                        Assign to Driver
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
                  <Card key={order.id} className={`p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${STATUS_COLORS.Ready.bg} ${STATUS_COLORS.Ready.border}`} onClick={() => setSelectedOrderId(order.id)}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold">Order #{order.orderNumber}</div>
                        <div className="text-sm text-muted-foreground">{order.customerAddress}</div>
                        <div className="text-sm text-muted-foreground mt-1">Phone: {order.customerPhone}</div>
                        <div className="text-sm text-muted-foreground">Area: {order.area || 'N/A'}</div>
                        <div className={`text-sm font-medium ${order.driverName ? 'text-green-600' : 'text-muted-foreground'}`}>Driver: {order.driverName || 'N/A'}</div>
                        {order.deliveryTime && (
                          <div className="text-sm text-muted-foreground mt-1">Delivery Time: {new Date(order.deliveryTime).toLocaleString()}</div>
                        )}
                      </div>
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); setOrderToAssign(order.id); setShowDriverModal(true); }}>
                        Assign to Driver
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
                  <Card key={order.id} className={`p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${STATUS_COLORS['On the Way'].bg} ${STATUS_COLORS['On the Way'].border}`} onClick={() => setSelectedOrderId(order.id)}>
                    <div className="font-semibold">Order #{order.orderNumber}</div>
                    <div className="text-sm text-muted-foreground">{order.customerAddress}</div>
                    <div className="text-sm text-muted-foreground mt-1">Phone: {order.customerPhone}</div>
                    <div className="text-sm text-muted-foreground">Area: {order.area || 'N/A'}</div>
                    <div className={`text-sm font-medium ${order.driverName ? 'text-green-600' : 'text-muted-foreground'}`}>Driver: {order.driverName || 'N/A'}</div>
                    {order.deliveryTime && (
                      <div className="text-sm text-muted-foreground mt-1">Delivery Time: {new Date(order.deliveryTime).toLocaleString()}</div>
                    )}
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Delivered Tab */}
            <TabsContent value="delivered" className="space-y-3">
              {deliveredOrders.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No delivered orders</div>
              ) : (
                deliveredOrders.map((order: any) => (
                  <Card key={order.id} className={`p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${STATUS_COLORS.Delivered.bg} ${STATUS_COLORS.Delivered.border}`} onClick={() => setSelectedOrderId(order.id)}>
                    <div className="font-semibold">Order #{order.orderNumber}</div>
                    <div className="text-sm text-muted-foreground">{order.customerAddress}</div>
                    <div className="text-sm text-muted-foreground mt-1">Phone: {order.customerPhone}</div>
                    <div className="text-sm text-muted-foreground">Area: {order.area || 'N/A'}</div>
                    <div className={`text-sm font-medium ${order.driverName ? 'text-green-600' : 'text-muted-foreground'}`}>Driver: {order.driverName || 'N/A'}</div>
                    {order.deliveryTime && (
                      <div className="text-sm text-muted-foreground mt-1">Delivery Time: {new Date(order.deliveryTime).toLocaleString()}</div>
                    )}
                  </Card>
                ))
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Order Details Modal (from Map Click) */}
      <Dialog open={selectedOrderId !== null} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Order #<span className="text-blue-600">{selectedOrderData?.orderNumber}</span></DialogTitle>
          </DialogHeader>
          {selectedOrderData && (
            <>
              {/* Main Details Card */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white">
                <div className="pt-6 px-6 pb-6">
                  <div className="space-y-6">
                    {/* Address Section */}
                    <div className="flex items-start space-x-4 pb-4 border-b border-slate-200">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</p>
                        <p className="text-base font-medium text-gray-900 mt-1">{selectedOrderData.customerAddress}</p>
                      </div>
                    </div>

                    {/* Contact Number Section */}
                    <div className="flex items-start space-x-4 pb-4 border-b border-slate-200">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Number</p>
                        <p className="text-base font-medium text-gray-900 mt-1">{selectedOrderData.customerPhone || "N/A"}</p>
                      </div>
                    </div>

                    {/* Area Section */}
                    <div className="flex items-start space-x-4 pb-4 border-b border-slate-200">
                      <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6.553 3.276A1 1 0 0021 20.382V9.618a1 1 0 00-1.447-.894L15 11m0 13V11m0 0L9 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Area</p>
                        <div className="mt-1">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                            {selectedOrderData.area}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Time Section */}
                    {selectedOrderData.deliveryTime && (
                      <div className="flex items-start space-x-4 pb-4 border-b border-slate-200">
                        <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Time</p>
                          <p className="text-base font-medium text-gray-900 mt-1">
                            {new Date(selectedOrderData.deliveryTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Status Section */}
                    <div className="flex items-start space-x-4 pb-4 border-b border-slate-200">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Status</p>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            selectedOrderData.status === "Pending" ? "bg-gray-100 text-gray-800" :
                            selectedOrderData.status === "Ready" ? "bg-blue-100 text-blue-800" :
                            selectedOrderData.status === "On the Way" ? "bg-orange-100 text-orange-800" :
                            "bg-green-100 text-green-800"
                          }`}>
                            {selectedOrderData.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Driver Section */}
                    {selectedOrderData.driverName ? (
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned Driver</p>
                          <p className="text-base font-medium text-green-600 mt-1">{selectedOrderData.driverName}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned Driver</p>
                          <p className="text-base font-medium text-gray-500 mt-1">Not assigned</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </>
          )}
        </DialogContent>
      </Dialog>

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
                variant={selectedDriver?.id === driver.id ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => {
                  // Extract driver ID - let backend validate
                  const driverId = Number(driver.id);
                  setSelectedDriver({ id: driverId, name: driver.name });
                }}
              >
                {driver.name}
              </Button>
            ))}
            {selectedDriver && (
              <Button
                className="w-full mt-4"
                onClick={handleSendToDriver}
              >
                Assign to Driver
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Map Modal with all features */}
      <FullscreenMapModal
        isOpen={showFullscreenMap}
        onClose={() => setShowFullscreenMap(false)}
        initialCenter={FORT_ERIE_CENTER}
        initialZoom={13}
        title="Order Tracking Map"
onMapReady={(map) => {
          fullscreenMapRef.current = map;
          
          // Clear old markers to prevent duplicates on reopen
          fullscreenMarkersRef.current.forEach((marker) => marker.setMap(null));
          fullscreenMarkersRef.current = [];
          
          // Reset restaurant marker
          if (fullscreenRestaurantMarkerRef.current) {
            fullscreenRestaurantMarkerRef.current.setMap(null);
            fullscreenRestaurantMarkerRef.current = null;
          }
          
          // Add restaurant marker
          fullscreenRestaurantMarkerRef.current = new google.maps.Marker({
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
          
          // Add all order markers from geocoded locations
          Object.entries(geocodedLocations).forEach(([orderId, location]) => {
            const order = orders.find((o: any) => o.id === parseInt(orderId));
            if (order && fullscreenMapRef.current && fullscreenMarkersRef.current) {
              const svgMarker = `<svg width="48" height="56" viewBox="0 0 48 56" xmlns="http://www.w3.org/2000/svg"><defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/></filter><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#60a5fa;stop-opacity:1" /><stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" /></linearGradient></defs><path d="M24 0C13.507 0 5 8.507 5 19c0 8 19 37 19 37s19-29 19-37c0-10.493-8.507-19-19-19z" fill="url(#grad)" stroke="white" stroke-width="2" filter="url(#shadow)"/><circle cx="24" cy="18" r="10" fill="white" opacity="0.95"/><text x="24" y="22" text-anchor="middle" font-size="10" font-weight="bold" fill="#3b82f6">#${order.orderNumber}</text></svg>`;
              
              const marker = new google.maps.Marker({
                map: fullscreenMapRef.current,
                position: { lat: location.lat, lng: location.lng },
                title: `Order #${order.orderNumber}`,
                icon: {
                  url: `data:image/svg+xml;base64,${btoa(svgMarker)}`,
                  scaledSize: new google.maps.Size(48, 56),
                  anchor: new google.maps.Point(24, 56),
                },
              });
              
              marker.addListener('click', () => {
                setSelectedOrderId(order.id);
              });
              
              fullscreenMarkersRef.current.push(marker);
            }
          });
        }}
      />
    </div>
  );
}
