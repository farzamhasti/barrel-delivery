import { useState, useEffect } from "react";
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

const DRIVER_SESSION_KEY = "driver_session_token";

export default function DriverDashboard() {
  const [, setLocation] = useLocation();
  
  // Driver authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  
  // Get stored session token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(DRIVER_SESSION_KEY);
    if (storedToken) {
      setSessionToken(storedToken);
    }
  }, []);
  
  // Check if driver is already logged in - use orders router for today's orders
  const { data: currentDriver, isLoading: checkingAuth, refetch: refetchDriver } = trpc.orders.getTodayWithItems.useQuery(
    undefined,
    { enabled: !!sessionToken }
  );
  
  // Mock login/logout - use localStorage for session management
  const loginMutation = {
    mutateAsync: async (data: any) => ({ sessionToken: 'mock-token' }),
    isPending: false,
  } as any;
  const logoutMutation = {
    mutateAsync: async (data: any) => ({}),
    isPending: false,
  } as any;
  
  const { data: assignedOrdersRaw = [], isLoading: ordersLoading, refetch: refetchOrders } = trpc.orders.getTodayWithItems.useQuery(
    undefined,
    { enabled: !!sessionToken }
  );
  const assignedOrders = (assignedOrdersRaw as any) || [];

  // Mock performance metrics
  const performanceMetrics = { todayDeliveryCount: 0, averageDeliveryTime: 0, completionRate: 0 };
  const metricsLoading = false;

  // Modal state for order details
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Type guard for selectedOrder
  const selectedOrderData = selectedOrder as any;

  // Tab state
  const [activeTab, setActiveTab] = useState("on-the-way");

  // Return Time state
  const { returnTime, setCalculation, clearTimer } = useReturnTimeCalculator();
  
  // Return time calculation mutation using Google Maps routing
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
      // Auto-recalculate return time after marking order as delivered
      if (sessionToken) {
        calculateReturnTimeMutation.mutate({ sessionToken });
      }
    },
    onError: (error: any) => {
      console.error("Failed to mark order as delivered:", error);
    },
  });

  // Driver status management
  const [driverStatus, setDriverStatus] = useState<"online" | "offline">("offline");
  const updateStatusMutation = {
    mutate: (data: any) => {
      // Mock implementation
      setDriverStatus(data.status || "offline");
    },
    isPending: false,
  } as any;

  // Initialize driver status from currentDriver
  useEffect(() => {
    if ((currentDriver as any)?.status) {
      setDriverStatus((currentDriver as any).status as "online" | "offline");
    }
  }, [currentDriver]);

  useEffect(() => {
    if (currentDriver) {
      setIsLoggedIn(true);
    }
  }, [currentDriver]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);

    try {
      const result = await loginMutation.mutateAsync({
        name: driverName,
        licenseNumber: licenseNumber,
      });
      
      // Store session token in localStorage
      if (result.sessionToken) {
        localStorage.setItem(DRIVER_SESSION_KEY, result.sessionToken);
        setSessionToken(result.sessionToken);
      }
      
      setDriverName("");
      setLicenseNumber("");
      setIsLoggedIn(true);
      
      // Refresh driver data
      refetchDriver();
    } catch (error: any) {
      setLoginError(error.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (sessionToken) {
        await logoutMutation.mutateAsync({ sessionToken });
      }
      
      // Clear localStorage
      localStorage.removeItem(DRIVER_SESSION_KEY);
      setSessionToken(null);
      setIsLoggedIn(false);
      
      // Redirect to driver login page
      setLocation("/driver-login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Redirect to driver login page even if logout fails
      setLocation("/driver-login");
    }
  };

  if (checkingAuth && sessionToken) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Login Form
  if (!isLoggedIn || !currentDriver) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <DeveloperCredit />
        <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src="/barrel-logo.png" 
                alt="The Barrel Restaurant (Pizza & Pasta)" 
                className="h-16 w-auto object-contain"
              />
            </div>
            <CardTitle className="text-2xl">Driver Login</CardTitle>
            <CardDescription>The Barrel Restaurant (Pizza & Pasta)</CardDescription>
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
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="license">License Number</Label>
                <Input
                  id="license"
                  placeholder="Enter your license number"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {loginError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !driverName || !licenseNumber}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>

              {/* Back Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setLocation("/")}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Back to Home
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  // Filter orders by status
  const onTheWayOrders = (assignedOrders as any[]).filter((order: any) => order.status !== "Delivered");
  const deliveredOrders = (assignedOrders as any[]).filter((order: any) => order.status === "Delivered");
  
  // Map area field to customerAddress for Google Maps navigation
  const ordersForMap = (onTheWayOrders as any[]).map((order: any) => ({
    ...order,
    customerAddress: order.customerAddress || order.area || order.customer?.address,
  }));

  // Driver Dashboard
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DeveloperCredit />
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-border/40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img 
              src="/barrel-logo.png" 
              alt="The Barrel Restaurant (Pizza & Pasta)" 
              className="h-12 w-auto object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {(currentDriver as any)?.name || 'Driver'}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Status Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Status Card */}
          <Card className={driverStatus === "online" ? "border-green-200 bg-green-50" : "border-gray-200"}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Badge className={driverStatus === "online" ? "bg-green-600" : "bg-gray-500"}>
                  {driverStatus === "online" ? "Online" : "Offline"}
                </Badge>
              </div>
              <div className="space-y-2">
                <Button
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => updateStatusMutation.mutate({ status: "online" })}
                  disabled={driverStatus === "online" || updateStatusMutation.isPending}
                >
                  Go Online
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                              onClick={() => updateStatusMutation.mutate({ status: "offline" })}
                  disabled={driverStatus === "offline" || updateStatusMutation.isPending}
                >
                  Go Offline
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{assignedOrders.length}</div>
              <p className="text-sm text-gray-600 mt-2">
                {onTheWayOrders.length} on the way • {deliveredOrders.length} delivered
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Return Time Card */}
        <Card className="mb-8 border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-lg">Estimated Return Time</CardTitle>
            <CardDescription>Calculate when you'll return to the restaurant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Button
                              onClick={() => calculateReturnTimeMutation.mutate({})}
                  disabled={calculateReturnTimeMutation.isPending || onTheWayOrders.length === 0}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {calculateReturnTimeMutation.isPending ? "Calculating..." : "Calculate Return Time"}
                </Button>
                <Button
                  onClick={() => openDeliveryMap(onTheWayOrders)}
                  disabled={onTheWayOrders.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Delivery with Map
                </Button>
                {onTheWayOrders.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">No active orders</p>
                )}
              </div>
              {returnTime && (
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-purple-100">
                  <p className="text-sm text-gray-600 mb-2">Time to Return</p>
                  <p className="text-4xl font-bold text-purple-600 font-mono">{returnTime.displayTime}</p>
                  <p className="text-xs text-gray-500 mt-2">({returnTime.ordersCount} orders)</p>
                  <div className="mt-3 text-xs text-gray-600 space-y-1">
                    <p>Pickup: {returnTime.breakdown.pickupMinutes}m</p>
                    <p>Delivery: {returnTime.breakdown.deliveryMinutes}m</p>
                    <p>Travel: {returnTime.breakdown.travelMinutes}m</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Analytics Card */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Today's Performance</CardTitle>
            <CardDescription>Track your delivery metrics for today</CardDescription>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Delivery Count */}
                <div className="flex flex-col items-center p-4 bg-white rounded-lg border border-blue-100">
                  <p className="text-sm text-gray-600 mb-2">Deliveries Completed</p>
                  <p className="text-4xl font-bold text-blue-600">{performanceMetrics.todayDeliveryCount}</p>
                  <p className="text-xs text-gray-500 mt-2">Today</p>
                </div>

                {/* Average Delivery Time */}
                <div className="flex flex-col items-center p-4 bg-white rounded-lg border border-blue-100">
                  <p className="text-sm text-gray-600 mb-2">Avg. Delivery Time</p>
                  <p className="text-4xl font-bold text-blue-600">{performanceMetrics.averageDeliveryTime}</p>
                  <p className="text-xs text-gray-500 mt-2">minutes</p>
                </div>

                {/* Completion Rate */}
                <div className="flex flex-col items-center p-4 bg-white rounded-lg border border-blue-100">
                  <p className="text-sm text-gray-600 mb-2">Completion Rate</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-4xl font-bold text-blue-600">{performanceMetrics.completionRate}</p>
                    <p className="text-2xl text-gray-600">%</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">of assigned orders</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Your Orders</CardTitle>
            <CardDescription>Manage your assigned deliveries</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 rounded-lg">
                <TabsTrigger value="on-the-way" className="flex items-center gap-2">
                  On the Way ({onTheWayOrders.length})
                </TabsTrigger>
                <TabsTrigger value="delivered" className="flex items-center gap-2">
                  Delivered ({deliveredOrders.length})
                </TabsTrigger>
              </TabsList>

              {/* On the Way Tab */}
              <TabsContent value="on-the-way" className="space-y-4">
                {ordersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading orders...</p>
                  </div>
                ) : onTheWayOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No orders on the way</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {onTheWayOrders.map((order: any) => (
                      <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">Order #{order.orderNumber}</h3>
                            <p className="text-gray-600 text-sm">Area: {order.area}</p>
                          </div>
                          <Badge variant="secondary">{order.status}</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <p className="text-gray-600">Address</p>
                            <p className="font-medium">{order.customerAddress}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Phone</p>
                            <p className="font-medium">{order.customerPhone}</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                          <div>
                            <p className="text-gray-600 text-sm">Total</p>
                            <p className="font-bold text-lg">${Number(order.totalPrice).toFixed(2)}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsDetailsModalOpen(true);
                              }}
                            >
                              View Details
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => {
                                markDeliveredMutation.mutate({ orderId: order.id, status: "Delivered" });
                              }}
                              disabled={markDeliveredMutation.isPending}
                            >
                              {markDeliveredMutation.isPending ? "Marking..." : "Delivered"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Delivered Tab */}
              <TabsContent value="delivered" className="space-y-4">
                {ordersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading orders...</p>
                  </div>
                ) : deliveredOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No delivered orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deliveredOrders.map((order: any) => (
                      <div key={order.id} className="border border-gray-200 rounded-lg p-4 bg-green-50 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">Order #{order.orderNumber}</h3>
                            <p className="text-gray-600 text-sm">{order.customerName}</p>
                          </div>
                          <Badge className="bg-green-600">Delivered</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <p className="text-gray-600">Address</p>
                            <p className="font-medium">{order.customerAddress}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Phone</p>
                            <p className="font-medium">{order.customerPhone}</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                          <div>
                            <p className="text-gray-600 text-sm">Total</p>
                            <p className="font-bold text-lg">${Number(order.totalPrice).toFixed(2)}</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsDetailsModalOpen(true);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Order Details Modal */}
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>Order #{selectedOrder?.orderNumber || selectedOrder?.id}</DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                {/* Phone Information */}
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold">{selectedOrder.customerPhone}</p>
                </div>

                {/* Address and Delivery Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Delivery Address</p>
                    <p className="font-semibold">{selectedOrder.customerAddress}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Delivery Time</p>
                    <p className="font-semibold">
                      {selectedOrder.deliveryTime 
                        ? new Date(selectedOrder.deliveryTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : 'Not set'}
                    </p>
                  </div>
                </div>

                {/* Receipt Image */}
                {(selectedOrder as any).receiptImage && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-2">Scanned Receipt</p>
                    <img 
                      src={(selectedOrder as any).receiptImage} 
                      alt="Receipt" 
                      className="w-full max-h-64 object-contain border rounded cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open((selectedOrder as any).receiptImage, '_blank')}
                    />
                  </div>
                )}



                {/* Special Notes */}
                {selectedOrder.notes && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Special Notes</p>
                    <p className="text-sm text-gray-700 p-2 bg-yellow-50 rounded">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  {selectedOrder.status !== "Delivered" && (
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        markDeliveredMutation.mutate({ orderId: selectedOrder.id, status: "Delivered" });
                      }}
                      disabled={markDeliveredMutation.isPending}
                    >
                      {markDeliveredMutation.isPending ? "Marking as Delivered..." : "Mark as Delivered"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
