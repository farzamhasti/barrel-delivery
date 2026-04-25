import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, User, ChefHat } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DeveloperCredit } from "@/components/DeveloperCredit";

export default function KitchenLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.system.login.useMutation({
    onSuccess: (data: any) => {
      console.log('[KitchenLogin] onSuccess called with data:', data);
      if (data.sessionToken && data.role) {
        // Store session in localStorage, sessionStorage, and window object as fallback
        try {
          localStorage.setItem("systemSessionToken", data.sessionToken);
          localStorage.setItem("systemRole", data.role);
          localStorage.setItem("systemUsername", data.username);
        } catch (e) {
          console.warn('[Login] localStorage not available, using fallback storage');
        }
        // Also store in sessionStorage and window as fallback
        sessionStorage.setItem("systemSessionToken", data.sessionToken);
        sessionStorage.setItem("systemRole", data.role);
        sessionStorage.setItem("systemUsername", data.username);
        (window as any).__systemSessionToken = data.sessionToken;
        (window as any).__systemRole = data.role;
        (window as any).__systemUsername = data.username;
        toast.success("Login successful!");
        setIsLoading(false);
        setLocation("/kitchen");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Login failed");
      setIsLoading(false);
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!username || !password) {
      toast.error("Please enter username and password");
      setIsLoading(false);
      return;
    }

    loginMutation.mutate({
      username,
      password,
      role: "kitchen",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex flex-col">
      <DeveloperCredit />
      <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-orange-600 mx-auto mb-4">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl text-center">Kitchen Dashboard</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access the kitchen dashboard
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Error Message */}
            {loginMutation.isError && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Login Failed</p>
                  <p className="text-sm text-red-700">{loginMutation.error?.message}</p>
                </div>
              </div>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={isLoading || loginMutation.isPending}
            >
              {isLoading || loginMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Logging in...
                </>
              ) : (
                "Login to Kitchen Dashboard"
              )}
            </Button>

            {/* Back Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setLocation("/")}
                className="text-sm text-orange-600 hover:text-orange-700 underline"
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
