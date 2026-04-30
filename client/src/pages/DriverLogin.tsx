import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeveloperCredit } from "@/components/DeveloperCredit";

const DRIVER_SESSION_KEY = "driver_session_token";

export default function DriverLogin() {
  const [, setLocation] = useLocation();
  const [driverName, setDriverName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Real driver login mutation
  const loginMutation = trpc.drivers.login.useMutation({
    onSuccess: (data: any) => {
      localStorage.setItem(DRIVER_SESSION_KEY, data.sessionToken);
      setDriverName("");
      setLicenseNumber("");
      // Redirect to driver dashboard after successful login
      setLocation("/driver-dashboard");
    },
    onError: (error: any) => {
      setLoginError(error.message || "Login failed. Please check your credentials.");
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);

    try {
      await loginMutation.mutateAsync({
        name: driverName,
        licenseNumber: licenseNumber,
      });
    } catch (error: any) {
      setLoginError(error.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

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
