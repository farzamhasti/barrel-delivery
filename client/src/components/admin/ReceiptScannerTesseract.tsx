import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";

export function ReceiptScannerTesseract() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form state - minimal required fields
  const [formData, setFormData] = useState({
    checkNumber: "",
    address: "",
    phoneNumber: "",
    deliveryTime: "",
    enableDeliveryTime: false,
    area: "DN" as "DN" | "CP" | "B",
  });

  const createOrderMutation = trpc.orders.createFromReceipt.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - only check number and address are required
    if (!formData.checkNumber.trim()) {
      setError("Check Number is required");
      return;
    }
    if (!formData.address.trim()) {
      setError("Address is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createOrderMutation.mutateAsync({
        orderNumber: formData.checkNumber,
        customerAddress: formData.address,
        customerPhone: formData.phoneNumber || "", // Optional - can be empty
        area: formData.area as "DN" | "CP" | "B",
        deliveryTime: formData.enableDeliveryTime ? formData.deliveryTime : undefined,
        receiptText: "",
        receiptImage: "", // No image upload required
      });

      setSubmitSuccess(true);
      toast.success("Order created successfully!");
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          checkNumber: "",
          address: "",
          phoneNumber: "",
          deliveryTime: "",
          enableDeliveryTime: false,
          area: "DN" as "DN" | "CP" | "B",
        });
        setSubmitSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">New Order from Receipt</h2>

        {submitSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <span>Order created successfully!</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Check Number - REQUIRED */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Check Number <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="Enter check number from receipt"
              value={formData.checkNumber}
              onChange={(e) => setFormData({ ...formData, checkNumber: e.target.value })}
              required
            />
          </div>

          {/* Address - REQUIRED */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Delivery Address <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="Enter delivery address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          {/* Phone Number - OPTIONAL */}
          <div>
            <label className="block text-sm font-medium mb-2">Phone Number (Optional)</label>
            <Input
              type="tel"
              placeholder="Enter phone number (optional)"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </div>

          {/* Area - OPTIONAL */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Area (Optional)
            </label>
            <div className="flex gap-6">
              {["DN", "CP", "B"].map((areaOption) => (
                <label key={areaOption} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="area"
                    value={areaOption}
                    checked={formData.area === areaOption}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value as "DN" | "CP" | "B" })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{areaOption}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Delivery Time - OPTIONAL */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <input
                type="checkbox"
                checked={formData.enableDeliveryTime}
                onChange={(e) => setFormData({ ...formData, enableDeliveryTime: e.target.checked })}
                className="w-4 h-4"
              />
              Set Delivery Time (Optional)
            </label>
            {formData.enableDeliveryTime && (
              <Input
                type="datetime-local"
                value={formData.deliveryTime}
                onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
              />
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Order...
              </>
            ) : (
              "Create Order"
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Required fields: Check Number, Address
        </p>
      </Card>
    </div>
  );
}
