import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { DeveloperCredit } from "@/components/DeveloperCredit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [loggedInDriverName, setLoggedInDriverName] = useState<string | null>(null);
  const [currentDriverId, setCurrentDriverId] = useState<number | null>(null);
  const [driverStatus, setDriverStatus] = useState<"online" | "offline">("offline");
  const [deliveredOrders, setDeliveredOrders] = useState<Set<number>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedStatisticsDate, setSelectedStatisticsDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [deliveredCount, setDeliveredCount] = useState<number>(0);
  const [returnTimeSeconds, setReturnTimeSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  
  // Get stored session token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(DRIVER_SESSION_KEY);
    if (storedToken) {
      setSessionToken(storedToken);
      setIsLoggedIn(true);
      // Retrieve driver name and ID from localStorage
      const storedName = localStorage.getItem("driver_name");
      const storedId = localStorage.getItem("driver_id");
      if (storedName) setLoggedInDriverName(storedName);
      if (storedId) setCurrentDriverId(parseInt(storedId));
    }
  }, []);
  
  // Real driver login mutation
  const loginMutation = trpc.drivers.login.useMutation({
    onSuccess: (data: any) => {
      localStorage.setItem(DRIVER_SESSION_KEY, data.sessionToken);
      localStorage.setItem("driver_name", data.driverName);
      localStorage.setItem("driver_id", data.driverId);
      setSessionToken(data.sessionToken);
      setLoggedInDriverName(data.driverName);
      setCurrentDriverId(data.driverId);
      setIsLoggedIn(true);
      setDriverName("");
      setLicenseNumber("");
      setLoginError("");
    },
    onError: (error: any) => {
      setLoginError(error.message || "Login failed. Please check your credentials.");
    },
  });
  
  // Update driver status mutation
  const updateStatusMutation = trpc.drivers.updateStatus.useMutation({
    onSuccess: () => {
      // Status updated successfully - it will sync with admin and kitchen dashboards
    },
    onError: (error: any) => {
      console.error("Failed to update status:", error);
    },
  });

  // Update order status mutation
  const updateOrderStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      // Order status updated successfully
    },
    onError: (error: any) => {
      console.error("Failed to update order status:", error);
    },
  });
  
  // Get assigned orders for today
  const { data: assignedOrdersRaw = [] } = trpc.orders.getTodayWithItems.useQuery(
    currentDriverId ? { driverId: currentDriverId } : undefined,
    { enabled: !!sessionToken && !!currentDriverId }
  );
  const assignedOrders = (assignedOrdersRaw as any) || [];

  // Get delivered orders count for selected date
  const { data: deliveredCountData } = trpc.drivers.getDeliveredOrdersCountByDate.useQuery(
    currentDriverId && selectedStatisticsDate
      ? { driverId: currentDriverId, date: selectedStatisticsDate }
      : undefined,
    { enabled: !!currentDriverId && !!selectedStatisticsDate }
  );

  // Save return time mutation
  const saveReturnTimeMutation = trpc.drivers.saveReturnTime.useMutation({
    onError: (error: any) => {
      console.error('Error saving return time:', error);
    },
  });

  // Clear return time mutation
  const clearReturnTimeMutation = trpc.drivers.clearReturnTime.useMutation({
    onError: (error: any) => {
      console.error('Error clearing return time:', error);
    },
  });

  // Calculate return time mutation
  const calculateReturnTimeMutation = trpc.drivers.calculateReturnTime.useMutation({
    onSuccess: (result: any) => {
      if (result.orderCount === 0) {
        alert('No active deliveries to calculate');
        setIsTimerRunning(false);
      } else {
        // Start the countdown timer with the calculated return time in seconds
        setReturnTimeSeconds(result.totalReturnTime);
        setIsTimerRunning(true);
        console.log(`Timer started: ${result.totalReturnTime} seconds (${result.formattedTime})`);
        
        // Save the return time to the database so it appears in admin/kitchen dashboards
        if (currentDriverId) {
          saveReturnTimeMutation.mutate({
            driverId: currentDriverId,
            returnTimeSeconds: result.totalReturnTime,
          });
        }
      }
    },
    onError: (error: any) => {
      console.error('Error calculating return time:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to calculate return time'}`);
      setIsTimerRunning(false);
    },
  });

  // Countdown timer effect
  useEffect(() => {
    if (!isTimerRunning || returnTimeSeconds <= 0) {
      if (returnTimeSeconds <= 0 && isTimerRunning) {
        setIsTimerRunning(false);
      }
      return;
    }

    const interval = setInterval(() => {
      setReturnTimeSeconds((prev) => {
        const newValue = prev - 1;
        if (newValue <= 0) {
          setIsTimerRunning(false);
          return 0;
        }
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, returnTimeSeconds]);

  // Update delivered count when data changes
  useEffect(() => {
    if (deliveredCountData?.count !== undefined) {
      setDeliveredCount(deliveredCountData.count);
    }
  }, [deliveredCountData]);

  // Separate orders into "On the way" and "Delivered"
  const onTheWayOrders = assignedOrders.filter((order: any) => !deliveredOrders.has(order.id));
  const deliveredOrdersList = assignedOrders.filter((order: any) => deliveredOrders.has(order.id));

  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError("");
    
    try {
      await loginMutation.mutateAsync({
        name: driverName,
        licenseNumber: licenseNumber,
      });
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem(DRIVER_SESSION_KEY);
    localStorage.removeItem("driver_name");
    localStorage.removeItem("driver_id");
    setSessionToken(null);
    setIsLoggedIn(false);
    setLoggedInDriverName(null);
    setCurrentDriverId(null);
    setDriverName("");
    setLicenseNumber("");
    setLoginError("");
    setDeliveredOrders(new Set());
  };

  // Handle online status
  const handleGoOnline = () => {
    if (currentDriverId) {
      setDriverStatus("online");
      updateStatusMutation.mutate({ id: currentDriverId, status: "online" });
    }
  };

  // Handle offline status
  const handleGoOffline = () => {
    if (currentDriverId) {
      setDriverStatus("offline");
      updateStatusMutation.mutate({ id: currentDriverId, status: "offline" });
    }
  };

  // Handle mark as delivered
  const handleMarkDelivered = (orderId: number) => {
    setDeliveredOrders(new Set([...deliveredOrders, orderId]));
    updateOrderStatusMutation.mutate({ orderId: orderId, status: "Delivered" });
  };

  // Show login form if not logged in
  if (!sessionToken || !isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-center mb-6">
              <img src="/barrel-logo.png" alt="The Barrel" className="h-16 w-auto" />
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">Driver Login</h2>
            <p className="text-gray-600 text-center mb-6">The Barrel Restaurant (Pizza & Pasta)</p>
            
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {loginError}
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="name">Driver Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="license">License Number</Label>
                <Input
                  id="license"
                  type="text"
                  placeholder="Enter your license number"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <Button variant="link" onClick={() => setLocation("/")}>
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Driver Dashboard - Show after login
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DeveloperCredit />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img 
              src="/barrel-logo.png" 
              alt="The Barrel Restaurant" 
              className="h-12 w-auto object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome, {loggedInDriverName}</h1>
              <p className="text-gray-600 mt-1">Your Personal Delivery Dashboard</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 flex-1 overflow-y-auto">
        {/* Status, Statistics, Return Time, and Map Section - 2x2 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Section */}
          <Card className="border-2 h-fit">
          <CardHeader>
            <CardTitle className="text-xl">Your Status</CardTitle>
            <CardDescription>Update your availability for deliveries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge 
                  className={`text-lg px-4 py-2 ${
                    driverStatus === "online" 
                      ? "bg-green-600 hover:bg-green-700" 
                      : "bg-gray-600 hover:bg-gray-700"
                  }`}
                >
                  {driverStatus === "online" ? "🟢 Online" : "🔴 Offline"}
                </Badge>
              </div>
              <div className="flex gap-3">
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleGoOnline}
                  disabled={driverStatus === "online" || updateStatusMutation.isPending}
                >
                  Go Online
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleGoOffline}
                  disabled={driverStatus === "offline" || updateStatusMutation.isPending}
                >
                  Go Offline
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

          {/* Delivery Statistics Section */}
          <Card className="border-2 h-fit">
            <CardHeader>
              <CardTitle className="text-xl">Delivery Statistics</CardTitle>
              <CardDescription>View orders delivered on a specific date</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="statistics-date" className="mb-2 block">Select Date</Label>
                  <Input
                    id="statistics-date"
                    type="date"
                    value={selectedStatisticsDate}
                    onChange={(e) => setSelectedStatisticsDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col items-center justify-center bg-blue-50 rounded-lg p-6 min-w-[150px]">
                  <p className="text-sm text-gray-600 mb-2">Orders Delivered</p>
                  <p className="text-4xl font-bold text-blue-600">{deliveredCount}</p>
                  <p className="text-xs text-gray-500 mt-2">{selectedStatisticsDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Management Card - Return Time & Map */}
          <Card className="border-2 lg:col-span-2 h-fit">
            <CardHeader>
              <CardTitle className="text-xl">Delivery Management</CardTitle>
              <CardDescription>Calculate return time and view your delivery route</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Return Time Section */}
                <div className="flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Estimated Return Time</h3>
                    
                    {/* Countdown Timer Display */}
                    {isTimerRunning && returnTimeSeconds > 0 && (
                      <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-600 mb-2">Time Remaining:</p>
                        <p className="text-4xl font-bold text-orange-600">
                          {Math.floor(returnTimeSeconds / 60)}:{String(returnTimeSeconds % 60).padStart(2, '0')}
                        </p>
                      </div>
                    )}
                    
                    {returnTimeSeconds === 0 && !isTimerRunning && (
                      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-600 mb-2">Status:</p>
                        <p className="text-2xl font-bold text-green-600">Returned!</p>
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-600 mb-4">Based on:</p>
                    <ul className="text-sm text-gray-700 mb-6 space-y-2">
                      <li>• 30 seconds for pickup</li>
                      <li>• 1 minute 30 seconds per delivery ({assignedOrders.length} orders)</li>
                      <li>• Optimal travel time</li>
                    </ul>
                  </div>
                  <div className="flex gap-2 w-full">
                    <button
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-semibold text-lg"
                      disabled={calculateReturnTimeMutation.isPending}
                      onClick={() => {
                        console.log('Button clicked, currentDriverId:', currentDriverId);
                        if (!currentDriverId) {
                          alert('Driver not logged in');
                          return;
                        }
                        // Check if driver has active orders (case-insensitive comparison)
                        const activeOrders = assignedOrders.filter((order: any) => order.status?.toLowerCase() === 'on the way');
                        if (activeOrders.length === 0) {
                          alert('No active deliveries. Please add orders first.');
                          return;
                        }
                        calculateReturnTimeMutation.mutate({
                          driverId: currentDriverId,
                          restaurantAddress: '224 Garrison Rd, Fort Erie, ON L2A 1M7',
                        });
                        console.log('Mutate called');
                      }}
                    >
                      {calculateReturnTimeMutation.isPending ? 'Calculating...' : 'Calculate Return Time'}
                    </button>
                    <button
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                      disabled={!isTimerRunning}
                      onClick={() => {
                        setIsTimerRunning(false);
                        setReturnTimeSeconds(0);
                        // Clear the return time from database
                        if (currentDriverId) {
                          clearReturnTimeMutation.mutate({ driverId: currentDriverId });
                        }
                        console.log('Timer stopped and cleared');
                      }}
                    >
                      Stop
                    </button>
                  </div>
                </div>

                {/* Delivery Map Section */}
                <div className="flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Delivery Route</h3>
                    <p className="text-sm text-gray-600 mb-4">View and navigate your delivery route</p>
                  </div>
                  <Button
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700 text-white w-full"
                    onClick={async () => {
                      try {
                        console.log('[Delivery with Map] Button clicked');
                        console.log('[Delivery with Map] assignedOrders:', assignedOrders);
                        
                        if (assignedOrders.length === 0) {
                          alert('No active deliveries to show on map');
                          return;
                        }

                        // Filter orders that have coordinates (explicitly check for null/undefined, not falsy)
                        const ordersWithCoordinates = assignedOrders.filter(
                          (order: any) => order.customerLatitude !== null && order.customerLatitude !== undefined && order.customerLongitude !== null && order.customerLongitude !== undefined
                        );

                        console.log('[Delivery with Map] ordersWithCoordinates:', ordersWithCoordinates);

                        if (ordersWithCoordinates.length === 0) {
                          alert('No delivery coordinates available');
                          return;
                        }

                        // Restaurant coordinates: 224 Garrison Rd, Fort Erie, ON L2A 1M7
                        // The Barrel Restaurant - verified coordinates
                        const restaurantLat = 42.9052237;
                        const restaurantLng = -78.9232797;
                        const restaurantCoords = `${restaurantLat},${restaurantLng}`;
                        console.log('[Delivery with Map] Restaurant coordinates:', { restaurantLat, restaurantLng });

                        // Build waypoints from customer coordinates
                        const waypoints = ordersWithCoordinates
                          .map((order: any) => `${order.customerLatitude},${order.customerLongitude}`)
                          .join('|');

                        // Build Google Maps URL with optimization enabled
                        const isMobileDevice = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${restaurantCoords}&destination=${restaurantCoords}&waypoints=${waypoints}&optimize=true&travelmode=driving${isMobileDevice ? '&comclient=mobileapp' : ''}`;

                        console.log('[Delivery with Map] Generated URL:', mapsUrl);
                        console.log('[Delivery with Map] isMobileDevice:', isMobileDevice);

                        // Open Google Maps URL
                        if (isMobileDevice) {
                          // On mobile, use location.href for direct navigation
                          window.location.href = mapsUrl;
                        } else {
                          // On desktop, open in new tab
                          window.open(mapsUrl, '_blank');
                        }
                      } catch (error) {
                        console.error('[Delivery with Map] Error:', error);
                        alert('Error opening map: ' + (error instanceof Error ? error.message : String(error)));
                      }
                    }}
                  >
                    Delivery with Map
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Section with Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Your Deliveries</CardTitle>
            <CardDescription>
              {assignedOrders.length === 0 
                ? "No active deliveries at the moment" 
                : `You have ${assignedOrders.length} delivery order(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="on-the-way" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="on-the-way">
                  On the way ({onTheWayOrders.length})
                </TabsTrigger>
                <TabsTrigger value="delivered">
                  Delivered ({deliveredOrdersList.length})
                </TabsTrigger>
              </TabsList>

              {/* On the way tab */}
              <TabsContent value="on-the-way" className="mt-6">
                {onTheWayOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No deliveries on the way</p>
                    <p className="text-gray-400 mt-2">Check back soon for new orders</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {onTheWayOrders.map((order: any) => (
                      <Card 
                        key={order.id} 
                        className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetails(true);
                        }}
                      >
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-600">Order #</p>
                              <p className="text-lg font-semibold">{order.orderNumber || order.checkNumber || order.id}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Status</p>
                              <Badge className="bg-blue-600">On the way</Badge>
                            </div>
                            <div className="col-span-2">
                              <p className="text-sm text-gray-600">Delivery Address</p>
                              <p className="text-md font-medium">{order.customerAddress || order.area || "N/A"}</p>
                            </div>
                            {order.customerPhone && (
                              <div className="col-span-2">
                                <p className="text-sm text-gray-600">Customer Phone</p>
                                <p className="text-md font-medium">{order.customerPhone}</p>
                              </div>
                            )}
                            {order.deliveryTime && (
                              <div className="col-span-2">
                                <p className="text-sm text-gray-600">Delivery Time</p>
                                <p className="text-md font-medium">{new Date(order.deliveryTime).toLocaleString('en-US', { timeZone: 'America/Toronto' })}</p>
                              </div>
                            )}
                          </div>
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkDelivered(order.id);
                            }}
                            disabled={updateOrderStatusMutation.isPending}
                          >
                            Mark as Delivered
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Delivered tab */}
              <TabsContent value="delivered" className="mt-6">
                {deliveredOrdersList.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No delivered orders yet</p>
                    <p className="text-gray-400 mt-2">Orders will appear here once delivered</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deliveredOrdersList.map((order: any) => (
                      <Card key={order.id} className="border-l-4 border-l-green-500">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Order #</p>
                              <p className="text-lg font-semibold">{order.orderNumber || order.checkNumber || order.id}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Status</p>
                              <Badge className="bg-green-600">Delivered</Badge>
                            </div>
                            <div className="col-span-2">
                              <p className="text-sm text-gray-600">Delivery Address</p>
                              <p className="text-md font-medium">{order.customerAddress || order.area || "N/A"}</p>
                            </div>
                            {order.customerPhone && (
                              <div className="col-span-2">
                                <p className="text-sm text-gray-600">Customer Phone</p>
                                <p className="text-md font-medium">{order.customerPhone}</p>
                              </div>
                            )}
                            {order.deliveryTime && (
                              <div className="col-span-2">
                                <p className="text-sm text-gray-600">Delivery Time</p>
                                <p className="text-md font-medium">{new Date(order.deliveryTime).toLocaleString('en-US', { timeZone: 'America/Toronto' })}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <Card className="w-96 bg-white shadow-lg rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
              <div>
                <CardTitle>Order #{selectedOrder.orderNumber || selectedOrder.checkNumber || selectedOrder.id}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOrderDetails(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Main delivery address section */}
              <div className="mb-6 pb-6 border-b">
                <p className="font-bold text-lg">{selectedOrder.customerAddress || "N/A"}</p>
                {selectedOrder.customerPhone && (
                  <p className="text-sm text-gray-600 mt-1">{selectedOrder.customerPhone}</p>
                )}
              </div>

              {/* Icon-based info grid */}
              <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b">
                {/* Area */}
                {selectedOrder.area && (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                      <span className="text-purple-600 text-lg">📍</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">AREA</p>
                    <p className="font-medium text-sm">{selectedOrder.area}</p>
                  </div>
                )}

                {/* Delivery Time */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                    <span className="text-orange-600 text-lg">🕐</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">DELIVERY TIME</p>
                  <p className="font-medium text-sm">
                    {selectedOrder.deliveryTime ? new Date(selectedOrder.deliveryTime).toLocaleString('en-US', { timeZone: 'America/Toronto' }) : 'N/A'}
                  </p>
                </div>

                {/* Order Status */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                    <span className="text-blue-600 text-lg">✓</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">ORDER STATUS</p>
                  <p className="font-medium text-sm text-orange-600">{selectedOrder.status}</p>
                </div>
              </div>

              {/* Scanned Receipt Section */}
              {(selectedOrder.formattedReceiptImage || selectedOrder.receiptImage) && (
                <div>
                  <h3 className="font-semibold text-base mb-3">Scanned Receipt</h3>
                  <img 
                    src={selectedOrder.formattedReceiptImage || selectedOrder.receiptImage} 
                    alt="Receipt" 
                    className="w-full border border-gray-300 rounded-lg max-h-96 object-contain"
                  />
                </div>
              )}
              {!selectedOrder.formattedReceiptImage && !selectedOrder.receiptImage && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600">No receipt image available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
