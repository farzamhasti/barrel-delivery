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
  
  // Check if driver is already logged in
  const { data: currentDriver, isLoading: checkingAuth, refetch: refetchDriver } = trpc.driver.me.useQuery(
    sessionToken ? { sessionToken } : undefined,
    { enabled: !!sessionToken }
  );
  
  const loginMutation = trpc.driver.login.useMutation();
  const logoutMutation = trpc.driver.logout.useMutation();
  
  const { data: assignedOrders = [], isLoading: ordersLoading, refetch: refetchOrders } = trpc.driver.getAssignedOrders.useQuery(
    sessionToken ? { sessionToken } : undefined,
    { enabled: !!currentDriver && !!sessionToken }
  );

  // Modal state for order details
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Mutation for marking order as delivered
  const markDeliveredMutation = trpc.driver.markOrderDelivered.useMutation({
    onSuccess: () => {
      setIsDetailsModalOpen(false);
      setSelectedOrder(null);
      refetchOrders();
    },
    onError: (error: any) => {
      console.error("Failed to mark order as delivered:", error);
    },
  });

  // Driver status management
  const [driverStatus, setDriverStatus] = useState<"online" | "offline">("offline");
  const updateStatusMutation = trpc.driver.updateStatus.useMutation({
    onSuccess: (result) => {
      setDriverStatus(result.status);
    },
    onError: (error) => {
      console.error("Failed to update status:", error);
    },
  });

  // Initialize driver status from currentDriver
  useEffect(() => {
    if (currentDriver?.status) {
      setDriverStatus(currentDriver.status as "online" | "offline");
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
      
      // Redirect to home page
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
      // Redirect to home page even if logout fails
      setLocation("/");
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
            <CardTitle className="text-2xl">Driver Login</CardTitle>
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

  // Driver Dashboard
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DeveloperCredit />
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome, {currentDriver?.name}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Status and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
                  onClick={() => sessionToken && updateStatusMutation.mutate({ sessionToken, status: "online" })}
                  disabled={driverStatus === "online" || updateStatusMutation.isPending}
                >
                  Go Online
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => sessionToken && updateStatusMutation.mutate({ sessionToken, status: "offline" })}
                  disabled={driverStatus === "offline" || updateStatusMutation.isPending}
                >
                  Go Offline
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Assigned Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{assignedOrders.length}</div>
            </CardContent>
          </Card>


        </div>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Assigned Orders</CardTitle>
            <CardDescription>Orders assigned to you for delivery</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-gray-600">Loading orders...</p>
              </div>
            ) : assignedOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No orders assigned yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignedOrders.map((order: any) => (
                  <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">Order #{order.id}</h3>
                        <p className="text-gray-600 text-sm">{order.customerName}</p>
                      </div>
                      <Badge variant={order.status === "Delivered" ? "default" : "secondary"}>
                        {order.status}
                      </Badge>
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
                        {order.status !== "Delivered" && (
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                              if (sessionToken) {
                                markDeliveredMutation.mutate({ sessionToken, orderId: order.id });
                              }
                            }}
                            disabled={markDeliveredMutation.isPending}
                          >
                            {markDeliveredMutation.isPending ? "Marking..." : "Delivered"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details Modal */}
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>Order #{selectedOrder?.id}</DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                {/* Customer Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Customer Name</p>
                    <p className="font-semibold">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-semibold">{selectedOrder.customerPhone}</p>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <p className="text-sm text-gray-600">Delivery Address</p>
                  <p className="font-semibold">{selectedOrder.customerAddress}</p>
                </div>

                {/* Order Items */}
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">Order Items</p>
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <div className="space-y-2">
                      {selectedOrder.items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{item.menuItemName || item.itemName || 'Unknown Item'}</p>
                            <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-semibold">${Number(item.priceAtOrder || item.price || 0).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No items in this order</p>
                  )}
                </div>

                {/* Special Notes */}
                {selectedOrder.notes && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Special Notes</p>
                    <p className="text-sm text-gray-700 p-2 bg-yellow-50 rounded">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Order Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">Total</p>
                    <p className="text-xl font-bold">${Number(selectedOrder.totalPrice).toFixed(2)}</p>
                  </div>
                </div>

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
                        if (sessionToken) {
                          markDeliveredMutation.mutate({ sessionToken, orderId: selectedOrder.id });
                        }
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
