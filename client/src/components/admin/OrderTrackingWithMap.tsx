import { useState, useEffect, useRef, useCallback } from "react";
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

  // Listen for return time updates from driver dashboard
  useEffect(() => {
    const handleReturnTimeUpdate = (event: any) => {
      const { driverId, returnTime } = event.detail;
      setDriverReturnTimes((prev) => ({
        ...prev,
        [driverId]: returnTime,
      }));
    };

    // Load return times from localStorage on mount
    const loadReturnTimesFromStorage = () => {
      const times: Record<number, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('driver-return-time-')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.driverId && data.returnTime) {
              times[data.driverId] = data.returnTime;
            }
          } catch (e) {
            console.error('Failed to parse return time data:', e);
          }
        }
      }
      setDriverReturnTimes(times);
    };

    loadReturnTimesFromStorage();
    window.addEventListener('returnTimeUpdated', handleReturnTimeUpdate);

    return () => {
      window.removeEventListener('returnTimeUpdated', handleReturnTimeUpdate);
    };
  }, []);

  // Fetch today's orders with items for complete data
  const { data: allOrders = [], isLoading } = trpc.orders.getTodayOrdersWithItems.useQuery();
  
  // Fetch drivers for Active Drivers section
  const { data: drivers = [], isLoading: driversLoading } = trpc.drivers.list.useQuery();
  const activeDrivers = drivers.filter((d: any) => d.status === "online" && d.isActive);

  // Fetch selected order with items
  const { data: selectedOrder } = trpc.orders.getById.useQuery(
    { orderId: selectedOrderId || 0 },
    { enabled: !!selectedOrderId }
  );

  // Initialize map and add markers
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add restaurant marker
    const restaurantMarker = new google.maps.Marker({
      position: RESTAURANT_ADDRESS,
      map: map,
      title: "The Barrel Restaurant",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#FF6B35",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
      },
    });
    markersRef.current.push(restaurantMarker);

    // Add order markers
    allOrders.forEach((order: any) => {
      if (order.customerLatitude && order.customerLongitude) {
        const marker = new google.maps.Marker({
          position: {
            lat: parseFloat(order.customerLatitude),
            lng: parseFloat(order.customerLongitude),
          },
          map: map,
          title: `Order #${order.id} - ${order.customerName}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#4285F4",
            fillOpacity: 0.8,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });

        marker.addListener("click", () => {
          setSelectedOrderId(order.id);
        });

        markersRef.current.push(marker);
      }
    });
  }, [allOrders]);

  // Format time for display
  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds === undefined) return "00:00";
    if (seconds <= 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Update return time display every second
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedTimes: Record<number, string> = {};
      
      for (const key in driverReturnTimes) {
        const driverId = parseInt(key);
        const timeStr = driverReturnTimes[driverId];
        
        if (timeStr && timeStr !== "00:00") {
          const [mins, secs] = timeStr.split(":").map(Number);
          let totalSeconds = mins * 60 + secs - 1;
          
          if (totalSeconds < 0) totalSeconds = 0;
          
          updatedTimes[driverId] = formatTime(totalSeconds);
        } else {
          updatedTimes[driverId] = timeStr;
        }
      }
      
      if (Object.keys(updatedTimes).length > 0) {
        setDriverReturnTimes(updatedTimes);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [driverReturnTimes]);

  const handleSendToDriver = (orderId: number) => {
    setOrderToAssign(orderId);
    setShowDriverModal(true);
  };

  const handleAssignDriver = () => {
    invalidateOrderCache(utils);
  };

  if (isLoading || driversLoading) {
    return <div className="p-4">Loading...</div>;
  }

  const selectedOrderData = allOrders.find((o: any) => o.id === selectedOrderId);

  return (
    <div className="space-y-4">
      {/* Map Section */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Order Tracking</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMap(!showMap)}
            className="gap-2"
          >
            {showMap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showMap ? "Hide Map" : "Show Map"}
          </Button>
        </div>

        {showMap && (
          <div className="mb-4">
            <MapView
              initialCenter={FORT_ERIE_CENTER}
              initialZoom={14}
              onMapReady={handleMapReady}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map and Active Drivers */}
          <div className="lg:col-span-2">
            {/* Active Drivers */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-3">Active Drivers ({activeDrivers.length})</h3>
              <div className="space-y-2">
                {activeDrivers.map((driver: any) => (
                  <div key={driver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{driver.name}</p>
                      <p className="text-sm text-gray-600">{driver.phone}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Online
                      </Badge>
                      <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-mono">
                          {driverReturnTimes[driver.id] || "00:00"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Orders */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Active Orders ({allOrders.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allOrders.map((order: any) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedOrderId === order.id
                      ? "bg-blue-50 border-2 border-blue-500"
                      : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">Order #{order.id}</p>
                      <p className="text-sm text-gray-600">{order.customerName}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Active Orders Details */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Active Orders ({allOrders.length})</h3>
        <div className="space-y-3">
          {allOrders.map((order: any) => (
            <div
              key={order.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold">Order #{order.id}</h4>
                  <p className="text-sm text-gray-600">{order.customerName}</p>
                </div>
                <Badge variant="outline">{order.status}</Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <MapPin className="w-4 h-4" />
                <span>{order.customerAddress}</span>
              </div>

              {selectedOrderData?.id === order.id && selectedOrderData?.items && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm font-medium mb-2">Items:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {selectedOrderData.items.map((item: any, idx: number) => (
                      <li key={idx}>
                        {item.quantity}x {item.name}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm font-medium mt-2">
                    Total: ${selectedOrderData.totalPrice?.toFixed(2) || "0.00"}
                  </p>
                </div>
              )}

              <Button
                onClick={() => handleSendToDriver(order.id)}
                className="w-full mt-3 bg-orange-600 hover:bg-orange-700 gap-2"
              >
                <Send className="w-4 h-4" />
                Send to Driver
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Driver Selection Modal */}
      {orderToAssign && (
        <DriverSelectionModal
          isOpen={showDriverModal}
          onClose={() => setShowDriverModal(false)}
          onAssign={handleAssignDriver}
          orderId={orderToAssign}
        />
      )}
    </div>
  );
}
