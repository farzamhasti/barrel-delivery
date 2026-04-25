import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Eye, EyeOff, Clock, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { invalidateOrderCache } from "@/lib/invalidation";
import { MapView } from "@/components/Map";
import { DriverSelectionModal } from "@/components/DriverSelectionModal";

const FORT_ERIE_CENTER = { lat: 42.905191, lng: -78.9225479 };
const RESTAURANT_ADDRESS = { lat: 42.905191, lng: -78.9225479 };

// Helper function to calculate remaining time from backend data
function calculateRemainingTime(totalSeconds: number | null, startTimestamp: Date | null): string {
  if (!totalSeconds || !startTimestamp) return "00:00";
  
  const now = Date.now();
  const startTime = new Date(startTimestamp).getTime();
  const elapsedSeconds = Math.floor((now - startTime) / 1000);
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
  const [updateTrigger, setUpdateTrigger] = useState(0); // Trigger re-renders for countdown
  const [driverReturnTimes, setDriverReturnTimes] = useState<Array<{driverId: number, returnTime: any}>>([]);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Fetch today's orders with items for complete data
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.getTodayOrdersWithItems.useQuery();
  
  // Fetch drivers for Active Drivers section
  const { data: drivers = [], isLoading: driversLoading } = trpc.drivers.list.useQuery();
  const activeDrivers = drivers.filter((d: any) => d.status === "online" && d.isActive);

  // Fetch return time for all active drivers
  useEffect(() => {
    const fetchReturnTimes = async () => {
      const times = await Promise.all(
        activeDrivers.map(async (driver: any) => {
          try {
            const returnTime = await utils.drivers.getReturnTime.fetch({ driverId: driver.id });
            return { driverId: driver.id, returnTime };
          } catch (error) {
            console.error(`Failed to fetch return time for driver ${driver.id}:`, error);
            return { driverId: driver.id, returnTime: null };
          }
        })
      );
      setDriverReturnTimes(times);
    };
    
    if (activeDrivers.length > 0) {
      fetchReturnTimes();
      const interval = setInterval(fetchReturnTimes, 5000);
      return () => clearInterval(interval);
    }
  }, [activeDrivers, utils]);

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
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Update countdown display every second (UI only, not logic)
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const assignDriverMutation = trpc.orders.assignDriver.useMutation();
  const updateStatusMutation = trpc.orders.updateStatus.useMutation();

  const handleAssignDriver = async (driverId: number) => {
    if (!orderToAssign) return;

    try {
      await assignDriverMutation.mutateAsync({
        orderId: orderToAssign,
        driverId,
      });

      setShowDriverModal(false);
      setOrderToAssign(null);
      utils.orders.getTodayOrdersWithItems.invalidate();
    } catch (error) {
      console.error("Failed to assign driver:", error);
    }
  };

  const handleMarkDelivered = async (orderId: number) => {
    try {
      await updateStatusMutation.mutateAsync({
        orderId,
        status: "Delivered",
      });

      setSelectedOrderId(null);
      utils.orders.getTodayOrdersWithItems.invalidate();
    } catch (error) {
      console.error("Failed to mark order as delivered:", error);
    }
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Map Section */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Order Tracking</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMap(!showMap)}
            className="gap-2"
          >
            {showMap ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showMap ? "Hide" : "Show"} Map
          </Button>
        </div>

        {showMap && (
          <Card className="flex-1 overflow-hidden h-96 lg:h-[600px]">
            <MapView
              onMapReady={(map) => {
                mapRef.current = map;
                map.setCenter(FORT_ERIE_CENTER);
                map.setZoom(13);
              }}
            />
          </Card>
        )}
      </div>

      {/* Right Panel - Orders and Drivers */}
      <div className="w-96 flex flex-col gap-4 overflow-y-auto">
        {/* Active Drivers Section */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Active Drivers ({activeDrivers.length})
          </h3>
          <div className="space-y-2">
            {activeDrivers.map((driver: any) => {
              const driverData = driverReturnTimes.find(d => d.driverId === driver.id);
              const remainingTime = calculateRemainingTime(
                driverData?.returnTime?.totalSeconds || null,
                driverData?.returnTime?.startTimestamp || null
              );

              return (
                <div key={driver.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{driver.name}</p>
                    <p className="text-sm text-gray-600">{driver.phone}</p>
                  </div>
                  <Badge variant={remainingTime === "00:00" ? "destructive" : "default"}>
                    {remainingTime}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Orders Section */}
        <Card className="p-4 flex-1 overflow-y-auto">
          <h3 className="font-semibold mb-3">Active Orders ({orders.length})</h3>
          <div className="space-y-2">
            {orders.map((order: any) => (
              <div
                key={order.id}
                className={`p-3 border rounded cursor-pointer transition ${
                  selectedOrderId === order.id ? "bg-blue-50 border-blue-500" : "hover:bg-gray-50"
                }`}
                onClick={() => setSelectedOrderId(order.id)}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium">Order #{order.id}</p>
                  <Badge variant="outline">{order.status}</Badge>
                </div>
                <p className="text-sm text-gray-600">{order.customer?.name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {order.customer?.address}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Selected Order Details Modal */}
      {selectedOrderId && selectedOrderData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 max-h-96 overflow-y-auto">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Order #{selectedOrderData.id}</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Customer</p>
                <p>{selectedOrderData.customerName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Address</p>
                <p className="text-sm">{selectedOrderData.customerAddress}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Items</p>
                <div className="space-y-1">
                  {selectedOrderData.items?.map((item: any) => (
                    <p key={item.id} className="text-sm">
                      {item.quantity}x {item.menuItemName} - ${item.priceAtOrder}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowDriverModal(true)}
                  className="flex-1"
                >
                  Assign Driver
                </Button>
                <Button
                  onClick={() => handleMarkDelivered(selectedOrderData.id)}
                  variant="outline"
                  className="flex-1"
                >
                  Mark Delivered
                </Button>
              </div>
              <Button
                onClick={() => setSelectedOrderId(null)}
                variant="ghost"
                className="w-full"
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Driver Selection Modal */}
      {showDriverModal && orderToAssign && (
        <DriverSelectionModal
          isOpen={showDriverModal}
          orderId={orderToAssign}
          onAssign={() => {
            setShowDriverModal(false);
            setOrderToAssign(null);
            utils.orders.getTodayOrdersWithItems.invalidate();
          }}
          onClose={() => setShowDriverModal(false)}
        />
      )}
    </div>
  );
}
