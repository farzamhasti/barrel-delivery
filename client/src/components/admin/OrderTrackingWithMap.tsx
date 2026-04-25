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

// Helper function to calculate remaining time from backend data
function calculateRemainingTime(totalSeconds: number | null, startTimestamp: number | null): string {
  if (!totalSeconds || !startTimestamp) return "00:00";
  
  const now = Date.now();
  const elapsedMs = now - startTimestamp;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function OrderTrackingWithMap() {
  const utils = trpc.useUtils();

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<number | null>(null);
  const [driverReturnTimes, setDriverReturnTimes] = useState<Record<number, string>>({});
  const [driverReturnData, setDriverReturnData] = useState<Record<number, { totalSeconds: number | null; startTimestamp: number | null }>>({});
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Fetch return times for all active drivers
  const fetchReturnTimes = useCallback(async () => {
    const data: Record<number, { totalSeconds: number | null; startTimestamp: number | null }> = {};
    const times: Record<number, string> = {};

    for (const driver of activeDrivers) {
      try {
        const returnTimeData = await utils.drivers.getReturnTime.fetch({ driverId: driver.id });
        if (returnTimeData) {
          const startTs = typeof returnTimeData.startTimestamp === 'number' ? returnTimeData.startTimestamp : (returnTimeData.startTimestamp as any)?.getTime?.() || null;
          data[driver.id] = {
            totalSeconds: returnTimeData.totalSeconds,
            startTimestamp: startTs,
          };
          times[driver.id] = calculateRemainingTime(returnTimeData.totalSeconds, startTs);
        } else {
          data[driver.id] = { totalSeconds: null, startTimestamp: null };
          times[driver.id] = "00:00";
        }
      } catch (error) {
        console.error(`Failed to fetch return time for driver ${driver.id}:`, error);
        data[driver.id] = { totalSeconds: null, startTimestamp: null };
        times[driver.id] = "00:00";
      }
    }

    setDriverReturnData(data);
    setDriverReturnTimes(times);
  }, [activeDrivers, utils.drivers.getReturnTime]);

  // Fetch return times on mount and when active drivers change
  useEffect(() => {
    if (activeDrivers.length > 0) {
      fetchReturnTimes();
    }
  }, [activeDrivers.length, fetchReturnTimes]);

  // Update countdown display every second by recalculating from backend data
  useEffect(() => {
    const interval = setInterval(() => {
      setDriverReturnTimes((prev) => {
        const updated = { ...prev };
        Object.keys(driverReturnData).forEach((driverId) => {
          const data = driverReturnData[parseInt(driverId)];
          updated[parseInt(driverId)] = calculateRemainingTime(data.totalSeconds, data.startTimestamp);
        });
        return updated;
      });
    }, 1000);

    refreshIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [driverReturnData]);

  // Fetch return times every 5 seconds to sync with backend
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeDrivers.length > 0) {
        fetchReturnTimes();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeDrivers.length, fetchReturnTimes]);

  // Auto-refetch orders every 5 seconds for real-time updates
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
    orders.forEach((order: any) => {
      if (order.customerLatitude && order.customerLongitude) {
        const marker = new google.maps.Marker({
          map: mapRef.current,
          position: {
            lat: parseFloat(order.customerLatitude as any),
            lng: parseFloat(order.customerLongitude as any),
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

  const handleAssignDriver = () => {
    invalidateOrderCache(utils);
  };

  const handleSendToDriver = (orderId: number) => {
    setOrderToAssign(orderId);
    setShowDriverModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Map Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Order Tracking</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMap(!showMap)}
          className="gap-2"
        >
          {showMap ? (
            <>
              <Eye className="w-4 h-4" />
              Hide Map
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" />
              Show Map
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Map - 2/3 width */}
        {showMap && (
          <div className="col-span-2">
            <Card className="p-0 overflow-hidden h-96 lg:h-[600px]">
              <MapView
                onMapReady={(map) => {
                  mapRef.current = map;
                  map.setCenter(FORT_ERIE_CENTER);
                  map.setZoom(13);
                }}
              />
            </Card>
          </div>
        )}

        {/* Active Drivers - 1/3 width */}
        <div className={showMap ? "col-span-1" : "col-span-3"}>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5" />
              <h3 className="font-semibold text-lg">Active Drivers ({activeDrivers.length})</h3>
            </div>

            <div className="space-y-4">
              {activeDrivers.map((driver: any) => (
                <div key={driver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{driver.name}</p>
                    <p className="text-sm text-gray-600">{driver.phoneNumber}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Online
                    </Badge>
                    <p className="text-sm font-mono mt-1 text-red-600">
                      {driverReturnTimes[driver.id] || "00:00"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Active Orders */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Active Orders ({orders.length})</h3>

        <div className="space-y-4">
          {orders.map((order: any) => (
            <div
              key={order.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedOrderId === order.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setSelectedOrderId(order.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold">Order #{order.id}</p>
                  <p className="text-sm text-gray-600">{order.customerName}</p>
                </div>
                <Badge variant={order.status === "Ready" ? "default" : "secondary"}>
                  {order.status}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <MapPin className="w-4 h-4" />
                <span>{order.customerAddress}</span>
              </div>

              {selectedOrderId === order.id && selectedOrderData && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Items:</p>
                    {selectedOrderData.items?.map((item: any, idx: number) => (
                      <p key={idx} className="text-sm text-gray-600">
                        {item.quantity}x {item.name}
                      </p>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-semibold">Total: ${selectedOrderData.totalPrice?.toFixed(2)}</span>
                    {order.status === "Ready" && (
                      <Button
                        size="sm"
                        className="gap-2 bg-orange-500 hover:bg-orange-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendToDriver(order.id);
                        }}
                      >
                        <Send className="w-4 h-4" />
                        Send to Driver
                      </Button>
                    )}
                  </div>
                </div>
              )}
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
