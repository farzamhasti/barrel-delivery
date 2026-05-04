import { useState, useEffect, useRef } from "react";
import { useSystemSession } from "@/_core/hooks/useSystemSession";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, ChefHat, MapPin, Clock, AlertCircle, CheckCircle2, Flame } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { invalidateOrderCache } from "@/lib/invalidation";
import { toast } from "sonner";
import { useDriverReturnTime } from "@/contexts/DriverReturnTimeContext";
import { KitchenReservations } from "@/pages/KitchenReservations";
import { DeveloperCredit } from "@/components/DeveloperCredit";
import { useCountdownTimer } from "@/hooks/useCountdownTimer";
import { NotificationIcon } from "@/components/NotificationIcon";
import { usePollingNotifications } from "@/hooks/usePollingNotifications";
import { useWebPush } from "@/hooks/useWebPush";
import { sendNotificationWithDedup } from "@/utils/notificationDedup";
import { playNotificationWithVibration } from "@/utils/notificationSound";

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

export default function KitchenDashboardPage() {
  const utils = trpc.useUtils();
  const { logout, isLoading: authLoading } = useSystemSession();
  const { driverReturnTimes } = useDriverReturnTime();
  const [activeTab, setActiveTab] = useState("active");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Fetch today's orders with items
  const { data: allOrders = [], isLoading, refetch } = trpc.orders.getTodayWithItems.useQuery();

  // Fetch active drivers with real-time refetching
  const { data: drivers = [] } = trpc.drivers.list.useQuery(undefined, {
    refetchInterval: 1000, // Refetch every 1 second to catch driver status changes
  });
  const activeDrivers = drivers.filter((d: any) => d.status === "online" && d.isActive);

  // Fetch pending reservations count with real-time refetching
  const { data: allReservations = [] } = trpc.reservations.getAll.useQuery(undefined, {
    refetchInterval: 1000, // Refetch every 1 second to catch new reservations
  });
  const pendingReservationsCount = allReservations.filter((r: any) => r.status === "Pending").length;

  // Mutation to update order status to ready
  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: async () => {
      toast.success("Order marked as ready!");
      // Immediately invalidate the cache and refetch
      await utils.orders.getTodayWithItems.invalidate();
      await refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update order status");
    },
  });

  // Filter to pending orders only (for active view)
  const pendingOrders = allOrders.filter((o: any) => o.status === "Pending");

  // Filter to ready orders only
  const readyOrders = allOrders.filter((o: any) => o.status === "Ready");

  // Get drivers with on_the_way orders
  const onTheWayOrders = allOrders.filter((o: any) => o.status === "On the Way");
  const driversWithOnTheWayOrders = new Set(
    onTheWayOrders.map((order: any) => order.driverId)
  );

  // Sort by delivery time (priority)
  const sortByDeliveryTime = (orders: any[]) => {
    return [...orders].sort((a, b) => {
      const timeA = a.deliveryTime ? new Date(a.deliveryTime).getTime() : Infinity;
      const timeB = b.deliveryTime ? new Date(b.deliveryTime).getTime() : Infinity;
      return timeA - timeB;
    });
  };

  const sortedPendingOrders = sortByDeliveryTime(pendingOrders);
  const sortedReadyOrders = sortByDeliveryTime(readyOrders);

  // Get kitchen username from system session
  const kitchenUsername = localStorage.getItem('systemUsername') || 'kitchen';
  
  // Polling notifications setup - continuous polling for kitchen user
  const { isSupported, permissionGranted, showNotification } = usePollingNotifications({
    enabled: true,
    pollInterval: 15000, // 15 seconds continuous polling
  });

  // Web Push setup for background notifications
  const { sendNotification: sendWebPush } = useWebPush({
    enabled: permissionGranted,
    username: kitchenUsername,
    dashboardType: 'kitchen',
  });

  // Track last seen order and reservation IDs to avoid duplicate notifications
  const lastSeenOrderIdsRef = useRef<Set<number>>(new Set());
  const lastSeenReservationIdsRef = useRef<Set<number>>(new Set());
  
  // Update tracked IDs whenever data changes (track current state, not just on mount)
  useEffect(() => {
    const currentOrderIds = new Set(pendingOrders.map((o: any) => o.id));
    lastSeenOrderIdsRef.current = currentOrderIds;
  }, []);
  
  useEffect(() => {
    const currentReservationIds = new Set(
      allReservations
        .filter((r: any) => r.status === 'Pending')
        .map((r: any) => r.id)
    );
    lastSeenReservationIdsRef.current = currentReservationIds;
  }, []);

  // Auto-refetch every 3 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Detect NEW pending orders and show notifications
  useEffect(() => {
    if (!permissionGranted || pendingOrders.length === 0) return;

    pendingOrders.forEach((order: any) => {
      // If this order ID is NOT in our tracking set, it's NEW
      if (!lastSeenOrderIdsRef.current.has(order.id)) {
        lastSeenOrderIdsRef.current.add(order.id);
        const title = `Order #${order.orderNumber} has arrived`;
        const body = order.customerAddress || 'No address';
        const tag = `kitchen-order-${order.id}`;
        console.log(`[Kitchen] New order detected: #${order.orderNumber}`);
        
        // Send polling notification
        showNotification({
          id: tag,
          title,
          body,
          timestamp: Date.now(),
          type: 'order',
        });
        
        // Send Web Push with deduplication
        sendNotificationWithDedup(title, body, tag, (t, b, tag) => {
          sendWebPush(t, b, tag);
        });
        
        // Play notification sound and vibration
        playNotificationWithVibration('order');
      }
    });
  }, [pendingOrders, permissionGranted, showNotification, sendWebPush, playNotificationWithVibration]);
  
  // Detect NEW reservations and show notifications
  useEffect(() => {
    if (!permissionGranted || allReservations.length === 0) return;

    allReservations.forEach((reservation: any) => {
      // Only notify if status is Pending AND this ID is NOT in our tracking set
      if (reservation.status === 'Pending' && !lastSeenReservationIdsRef.current.has(reservation.id)) {
        lastSeenReservationIdsRef.current.add(reservation.id);
        const reservationDate = new Date(reservation.date).toLocaleDateString();
        const title = `New Reservation: ${reservation.eventType} - ${reservationDate} - ${reservation.time} - ${reservation.numberOfPeople} people`;
        const body = reservation.description || 'No description';
        const tag = `kitchen-reservation-${reservation.id}`;
        console.log(`[Kitchen] New reservation detected: ${reservation.eventType}`);
        
        // Send polling notification
        showNotification({
          id: tag,
          title,
          body,
          timestamp: Date.now(),
          type: 'alert',
        });
        
        // Send Web Push with deduplication
        sendNotificationWithDedup(title, body, tag, (t, b, tag) => {
          sendWebPush(t, b, tag);
        });
        
        // Play notification sound and vibration
        playNotificationWithVibration('alert');
      }
    });
  }, [allReservations, permissionGranted, showNotification, sendWebPush]);

  // Calculate urgency level based on delivery time
  const getUrgencyLevel = (deliveryTime: string | null) => {
    if (!deliveryTime) return "normal";
    
    const now = new Date();
    const delivery = new Date(deliveryTime);
    const minutesUntilDelivery = (delivery.getTime() - now.getTime()) / (1000 * 60);

    if (minutesUntilDelivery < 0) return "late"; // Past delivery time
    if (minutesUntilDelivery < 15) return "urgent"; // Less than 15 minutes
    if (minutesUntilDelivery < 30) return "soon"; // Less than 30 minutes
    return "normal"; // 30+ minutes
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "late":
        return "bg-red-50 border-red-200";
      case "urgent":
        return "bg-orange-50 border-orange-200";
      case "soon":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-white border-border";
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "late":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "urgent":
        return <Flame className="w-4 h-4 text-orange-600" />;
      case "soon":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <ChefHat className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kitchen Dashboard</h1>
              <p className="text-sm text-gray-500">Manage orders and reservations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationIcon count={pendingReservationsCount} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              disabled={authLoading}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="active" className="text-base">
              Pending Orders ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="ready" className="text-base">
              Ready Orders ({readyOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Orders Tab */}
          <TabsContent value="active" className="space-y-4">
            {sortedPendingOrders.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No pending orders</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {sortedPendingOrders.map((order: any) => {
                  const urgency = getUrgencyLevel(order.deliveryTime);
                  return (
                    <Card
                      key={order.id}
                      className={`p-4 border-l-4 border-l-orange-500 cursor-pointer hover:shadow-md transition-shadow ${getUrgencyColor(urgency)}`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getUrgencyIcon(urgency)}
                            <h3 className="font-bold text-lg">Order #{order.orderNumber}</h3>
                            {order.deliveryTime && (
                              <Badge variant="outline" className="ml-auto">
                                {new Date(order.deliveryTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <MapPin className="w-4 h-4" />
                            {order.customerAddress || 'No address'}
                          </div>
                          {order.items && order.items.length > 0 && (
                            <div className="text-sm text-gray-700 bg-white bg-opacity-50 p-2 rounded">
                              {order.items.map((item: any, idx: number) => (
                                <div key={idx}>
                                  {item.quantity}x {item.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatusMutation.mutate({
                              orderId: order.id,
                              status: 'Ready',
                            });
                          }}
                          disabled={updateStatusMutation.isPending}
                          className="ml-4 bg-green-600 hover:bg-green-700"
                        >
                          {updateStatusMutation.isPending ? 'Updating...' : 'Mark Ready'}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Ready Orders Tab */}
          <TabsContent value="ready" className="space-y-4">
            {sortedReadyOrders.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No ready orders</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {sortedReadyOrders.map((order: any) => (
                  <Card
                    key={order.id}
                    className="p-4 border-l-4 border-l-green-500 cursor-pointer hover:shadow-md transition-shadow bg-green-50"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <h3 className="font-bold text-lg">Order #{order.orderNumber}</h3>
                          {order.deliveryTime && (
                            <Badge variant="outline" className="ml-auto">
                              {new Date(order.deliveryTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <MapPin className="w-4 h-4" />
                          {order.customerAddress || 'No address'}
                        </div>
                        {order.items && order.items.length > 0 && (
                          <div className="text-sm text-gray-700 bg-white bg-opacity-50 p-2 rounded">
                            {order.items.map((item: any, idx: number) => (
                              <div key={idx}>
                                {item.quantity}x {item.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Reservations Section */}
        <div className="mt-8">
          <KitchenReservations />
        </div>

        {/* Drivers Table */}
        {activeDrivers.length > 0 && (
          <Card className="mt-8 p-4">
            <h3 className="font-bold text-lg mb-4">Active Drivers</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-semibold">Driver</th>
                    <th className="text-left py-2 px-3 font-semibold">Status</th>
                    <th className="text-left py-2 px-3 font-semibold">Return Time</th>
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
          </Card>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Order #{selectedOrder.orderNumber}</h2>
                <Button variant="ghost" onClick={() => setSelectedOrder(null)}>
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Customer</label>
                  <p className="text-lg">{selectedOrder.customerName || 'N/A'}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600">Address</label>
                  <p className="text-lg">{selectedOrder.customerAddress || 'N/A'}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600">Items</label>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-gray-600">${item.price?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedOrder.deliveryTime && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Delivery Time</label>
                    <p className="text-lg">
                      {new Date(selectedOrder.deliveryTime).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Zoom Image Modal */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setZoomImageUrl(null)}
        >
          <img src={zoomImageUrl} alt="Order" className="max-w-4xl max-h-[90vh] object-contain" />
        </div>
      )}

      <DeveloperCredit />
    </div>
  );
}
