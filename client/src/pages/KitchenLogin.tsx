import { useEffect } from "react";
import { useLocation } from "wouter";
import { SystemLoginForm } from "@/components/SystemLoginForm";

export default function KitchenLogin() {
  const [, navigate] = useLocation();

  // Check if already logged in
  useEffect(() => {
    const sessionToken = localStorage.getItem("systemSessionToken");
    const role = localStorage.getItem("systemRole");
    
    if (sessionToken && role === "kitchen") {
      navigate("/kitchen");
    }
  }, [navigate]);

  const handleLoginSuccess = (sessionToken: string, role: string) => {
    if (role === "kitchen") {
      navigate("/kitchen");
    } else {
      // Wrong role
      localStorage.removeItem("systemSessionToken");
      localStorage.removeItem("systemRole");
      alert("This account does not have kitchen access");
    }
  };

  return (
    <SystemLoginForm
      title="Kitchen Dashboard"
      onLoginSuccess={handleLoginSuccess}
    />
  );
}
