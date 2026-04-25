import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Eye, EyeOff, Send, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { invalidateOrderCache } from "@/lib/invalidation";
import { MapView } from "@/components/Map";
import { DriverSelectionModal } from "@/components/DriverSelectionModal";

const FORT_ERIE_CENTER = { lat: 42.905191, lng: -78.9225479 };
const RESTAURANT_ADDRESS = { lat: 42.905191, lng: -78.9225479 };

export default function OrderTrackingWithMap() {
  const utils = trpc.useUtils();

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<number | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Fetch today's orders with items for complete data
  const { data: allOrders = [], isLoading } = trpc.orders.getTodayOrdersWithItems.useQuery();

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

  const handleSendToDriver = (orderId: number) => {
    setOrderToAssign(orderId);
    setShowDriverModal(true);
  };

  const handleAssignDriver = () => {
    invalidateOrderCache(utils);
  };

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  const selectedOrderData = allOrders.find((o: any) => o.id === selectedOrderId);

  return (
    <div className="space-y-4">
      {/* Map Section - Full Width */}
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
          <div className="mb-4 h-96 lg:h-[600px] rounded-lg overflow-hidden">
            <MapView
              initialCenter={FORT_ERIE_CENTER}
              initialZoom={14}
              onMapReady={handleMapReady}
            />
          </div>
        )}
      </Card>

      {/* Active Orders Section */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Active Orders ({allOrders.length})</h3>
        <div className="space-y-3">
          {allOrders.map((order: any) => {
            const isExpanded = expandedOrderId === order.id;
            const orderItems = selectedOrderData?.id === order.id ? selectedOrderData?.items : null;

            return (
              <div
                key={order.id}
                className={`border rounded-lg p-4 transition-all ${
                  isExpanded
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold">Order #{order.id}</h4>
                    <p className="text-sm text-gray-600">{order.customerName}</p>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {order.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{order.customerAddress}</span>
                </div>

                {order.area && (
                  <div className="text-sm text-gray-600 mb-3">
                    <span className="font-medium">Area:</span> <span className="text-orange-600">{order.area}</span>
                  </div>
                )}

                {/* Expandable Details */}
                {isExpanded && orderItems && (
                  <div className="mt-3 pt-3 border-t border-orange-200">
                    <p className="text-sm font-medium mb-2">Items:</p>
                    <ul className="text-sm text-gray-600 space-y-1 mb-3">
                      {orderItems.map((item: any, idx: number) => (
                        <li key={idx}>
                          {item.quantity}x {item.name}
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm font-medium">
                      Total: ${selectedOrderData?.totalPrice?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setExpandedOrderId(isExpanded ? null : order.id);
                    }}
                    className="gap-2"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Details
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleSendToDriver(order.id)}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send to Driver
                  </Button>
                </div>
              </div>
            );
          })}
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
