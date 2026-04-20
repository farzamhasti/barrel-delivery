import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function DriverDashboard() {
  const [, setLocation] = useLocation();
  
  // Driver authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if driver is already logged in
  const { data: currentDriver, isLoading: checkingAuth } = trpc.driver.me.useQuery();
  const loginMutation = trpc.driver.login.useMutation();
  const logoutMutation = trpc.driver.logout.useMutation();
  const { data: assignedOrders = [], isLoading: ordersLoading } = trpc.driver.getAssignedOrders.useQuery(
    undefined,
    { enabled: !!currentDriver }
  );

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
      await loginMutation.mutateAsync({
        name: driverName,
        licenseNumber: licenseNumber,
      });
      
      setDriverName("");
      setLicenseNumber("");
      setIsLoggedIn(true);
      
      // Refresh the page to load the new driver session
      window.location.reload();
    } catch (error: any) {
      setLoginError(error.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setIsLoggedIn(false);
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (checkingAuth) {
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
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
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Driver Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Assigned Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{assignedOrders.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Vehicle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{currentDriver?.vehicleType || "N/A"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Phone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{currentDriver?.phone || "N/A"}</div>
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
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
