import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeveloperCredit } from "@/components/DeveloperCredit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReturnTimeCalculator } from "@/hooks/useReturnTimeCalculator";
import { openDeliveryMap } from "@/_core/utils/googleMapsUrl";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const DRIVER_SESSION_KEY = "driver_session_id";

export default function DriverDashboard() {
  const [, setLocation] = useLocation();
  
  // Driver authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentDriverId, setCurrentDriverId] = useState<number | null>(null);
  const [loggedInDriverName, setLoggedInDriverName] = useState<string | null>(null);
  
  // Get stored driver ID from localStorage on mount
  useEffect(() => {
    const storedDriverId = localStorage.getItem(DRIVER_SESSION_KEY);
    if (storedDriverId) {
      setCurrentDriverId(parseInt(storedDriverId, 10));
      setIsLoggedIn(true);
    }
  }, []);
  
  // Login mutation
  const loginMutation = trpc.drivers.login.useMutation({
    onSuccess: (data) => {
      setCurrentDriverId(data.driverId);
      setLoggedInDriverName(data.driverName);
      setIsLoggedIn(true);
      localStorage.setItem(DRIVER_SESSION_KEY, data.driverId.toString());
      toast.success(`Welcome, ${data.driverName}!`);
      setLoginError("");
      setDriverName("");
      setLicenseNumber("");
    },
    onError: (error: any) => {
      setLoginError(error.message || "Invalid credentials");
      toast.error("Login failed");
    },
  });

  // Get assigned orders for the driver
  const { data: assignedOrders = [], isLoading: ordersLoading, refetch: refetchOrders } = trpc.drivers.getAssignedOrders.useQuery(
    { driverId: currentDriverId || 0 },
    { enabled: !!currentDriverId }
  );

  // Get driver info
  const { data: driverInfo } = trpc.drivers.getByName.useQuery(
    { name: loggedInDriverName || "" },
    { enabled: !!loggedInDriverName }
  );

  // Modal state for order details
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState("on-the-way");

  // Return Time state
  const { returnTime, setCalculation, clearTimer } = useReturnTimeCalculator();
  
  // Return time calculation mutation
  const calculateReturnTimeMutation = trpc.orders.calculateReturnTime.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        const displayTime = `${String(Math.floor(data.totalSeconds / 60)).padStart(2, '0')}:${String(data.totalSeconds % 60).padStart(2, '0')}`;
        setCalculation({
          totalSeconds: data.totalSeconds,
          totalMinutes: data.totalMinutes,
          displayTime,
          isActive: true,
          ordersCount: data.ordersCount,
          breakdown: data.breakdown,
        });
      }
    },
    onError: (error: any) => {
      console.error("Failed to calculate return time:", error);
    },
  });

  // Mutation for marking order as delivered
  const markDeliveredMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      setIsDetailsModalOpen(false);
      setSelectedOrder(null);
      refetchOrders();
      toast.success("Order marked as delivered");
      if (currentDriverId) {
        calculateReturnTimeMutation.mutate({});
      }
    },
    onError: (error: any) => {
      console.error("Failed to mark order as delivered:", error);
      toast.error("Failed to mark order as delivered");
    },
  });

  // Driver status management
  const [driverStatus, setDriverStatus] = useState<"online" | "offline">("offline");
  
  // Get tRPC utils for query invalidation
  const utils = trpc.useUtils();

  // Real tRPC mutation for updating driver status
  const updateStatusMutation = trpc.drivers.setStatus.useMutation({
    onSuccess: (data) => {
      if (data && (data as any).status) {
        setDriverStatus((data as any).status as "online" | "offline");
      }
      utils.drivers.list.invalidate();
      refetchOrders();
    },
    onError: (error: any) => {
      console.error("Failed to update driver status:", error);
      toast.error("Failed to update status");
    },
  });

  // Initialize driver status from driverInfo
  useEffect(() => {
    if (driverInfo) {
      setDriverStatus((driverInfo as any).status || "offline");
    }
  }, [driverInfo]);

  // Filter orders by status
  const onTheWayOrders = (assignedOrders as any[]).filter((o: any) => o.status === "On the Way") || [];
  const deliveredOrders = (assignedOrders as any[]).filter((o: any) => o.status === "Delivered") || [];

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !licenseNumber) {
      setLoginError("Please enter both name and license number");
      return;
    }
    await loginMutation.mutateAsync({ name: driverName, licenseNumber });
  };

  // Handle logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentDriverId(null);
    setLoggedInDriverName(null);
    setDriverStatus("offline");
    localStorage.removeItem(DRIVER_SESSION_KEY);
    setDriverName("");
    setLicenseNumber("");
    toast.success("Logged out successfully");
  };

  // Handle go online
  const handleGoOnline = () => {
    if (currentDriverId) {
      updateStatusMutation.mutate({ id: currentDriverId, status: "online" });
      setDriverStatus("online");
    }
  };

  // Handle go offline
  const handleGoOffline = () => {
    if (currentDriverId) {
      updateStatusMutation.mutate({ id: currentDriverId, status: "offline" });
      setDriverStatus("offline");
    }
  };

  // Handle mark as delivered
  const handleMarkDelivered = async (orderId: number) => {
    await markDeliveredMutation.mutateAsync({ orderId, status: "Delivered" });
  };

  // Handle calculate return time
  const handleCalculateReturnTime = () => {
    if (currentDriverId) {
      calculateReturnTimeMutation.mutate({});
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Driver Login</CardTitle>
            <CardDescription>Enter your credentials to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Driver Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  disabled={loginMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license">License Number</Label>
                <Input
                  id="license"
                  placeholder="Enter your license number"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  disabled={loginMutation.isPending}
                  type="password"
                />
              </div>
              {loginError && (
                <div className="text-red-500 text-sm">{loginError}</div>
              )}
              <Button 
                type="submit" 
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Logging in..." : "Login to Dashboard"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <DeveloperCredit />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Driver Panel</h1>
            <p className="text-sm text-gray-600 mt-1">{loggedInDriverName}</p>
          </div>

          <div className="space-y-4 flex-1">
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Status</p>
              <Badge className={driverStatus === "online" ? "bg-green-500" : "bg-gray-500"}>
                {driverStatus === "online" ? "Online" : "Offline"}
              </Badge>
              <div className="mt-3 space-y-2">
                {driverStatus === "offline" ? (
                  <Button 
                    onClick={handleGoOnline}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={updateStatusMutation.isPending}
                  >
                    Go Online
                  </Button>
                ) : (
                  <Button 
                    onClick={handleGoOffline}
                    className="w-full bg-gray-600 hover:bg-gray-700"
                    disabled={updateStatusMutation.isPending}
                  >
                    Go Offline
                  </Button>
                )}
              </div>
            </div>

            {driverStatus === "online" && onTheWayOrders.length > 0 && (
              <Button 
                onClick={handleCalculateReturnTime}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={calculateReturnTimeMutation.isPending}
              >
                Calculate Return Time
              </Button>
            )}

            {returnTime && returnTime.isActive && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Est. Return Time</p>
                <p className="text-2xl font-bold text-blue-600">{returnTime.displayTime}</p>
                <p className="text-xs text-gray-600 mt-2">{returnTime.ordersCount} orders</p>
              </div>
            )}
          </div>

          <Button 
            onClick={handleLogout}
            variant="outline"
            className="w-full"
          >
            Logout
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">My Deliveries</h2>
              <p className="text-gray-600 mt-2">Manage your assigned orders</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="on-the-way">
                  On the Way ({onTheWayOrders.length})
                </TabsTrigger>
                <TabsTrigger value="delivered">
                  Delivered ({deliveredOrders.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="on-the-way" className="space-y-4">
                {onTheWayOrders.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-gray-500">No orders on the way</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {onTheWayOrders.map((order: any) => (
                      <Card key={order.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>Order #{order.orderNumber}</CardTitle>
                              <CardDescription>{order.customerAddress}</CardDescription>
                            </div>
                            <Badge variant="outline">{order.status}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Customer</p>
                              <p className="font-medium">{order.customerName || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Phone</p>
                              <p className="font-medium">{order.customerPhone || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Area</p>
                              <p className="font-medium">{order.area || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Total</p>
                              <p className="font-medium">${order.totalPrice || "0.00"}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsDetailsModalOpen(true);
                              }}
                              variant="outline"
                              className="flex-1"
                            >
                              View Details
                            </Button>
                            <Button 
                              onClick={() => handleMarkDelivered(order.id)}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              disabled={markDeliveredMutation.isPending}
                            >
                              Delivered
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="delivered" className="space-y-4">
                {deliveredOrders.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-gray-500">No delivered orders yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {deliveredOrders.map((order: any) => (
                      <Card key={order.id} className="opacity-75">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>Order #{order.orderNumber}</CardTitle>
                              <CardDescription>{order.customerAddress}</CardDescription>
                            </div>
                            <Badge className="bg-green-600">Delivered</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="text-sm text-gray-600">
                          Delivered on {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : "N/A"}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details - #{selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription>{selectedOrder?.customerAddress}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Customer Name</p>
                <p className="font-medium">{selectedOrder?.customerName || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{selectedOrder?.customerPhone || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Area</p>
                <p className="font-medium">{selectedOrder?.area || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Price</p>
                <p className="font-medium">${selectedOrder?.totalPrice || "0.00"}</p>
              </div>
            </div>
            {selectedOrder?.receiptImage && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Receipt</p>
                <img src={selectedOrder.receiptImage} alt="Receipt" className="max-w-full h-auto rounded" />
              </div>
            )}
            <div className="flex gap-2">
              <Button 
                onClick={() => openDeliveryMap(selectedOrder?.customerAddress)}
                variant="outline"
                className="flex-1"
              >
                Open Map
              </Button>
              <Button 
                onClick={() => handleMarkDelivered(selectedOrder?.id)}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={markDeliveredMutation.isPending}
              >
                Mark as Delivered
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeveloperCredit />
    </div>
  );
}
