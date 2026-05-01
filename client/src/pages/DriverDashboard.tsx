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
      <div className="max-w-7xl mx-auto px-4 py-8 flex-1">
        {/* Status Section */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <CardTitle className="text-2xl">Your Status</CardTitle>
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
                          </div>
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleMarkDelivered(order.id)}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Order Details</CardTitle>
                <CardDescription>Order #{selectedOrder.orderNumber || selectedOrder.checkNumber || selectedOrder.id}</CardDescription>
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
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Delivery Address</p>
                <p className="font-medium">{selectedOrder.customerAddress || "N/A"}</p>
              </div>

              {selectedOrder.customerPhone && (
                <div>
                  <p className="text-sm text-gray-600">Customer Phone</p>
                  <p className="font-medium">{selectedOrder.customerPhone}</p>
                </div>
              )}

              {selectedOrder.area && (
                <div>
                  <p className="text-sm text-gray-600">Area</p>
                  <p className="font-medium">{selectedOrder.area}</p>
                </div>
              )}

              {selectedOrder.deliveryTime && (
                <div>
                  <p className="text-sm text-gray-600">Delivery Time</p>
                  <p className="font-medium">{selectedOrder.deliveryTime}</p>
                </div>
              )}

              {selectedOrder.formattedReceiptImage && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Scanned Receipt</p>
                  <img 
                    src={selectedOrder.formattedReceiptImage} 
                    alt="Receipt" 
                    className="w-full border border-gray-300 rounded-lg max-h-64 object-contain"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
