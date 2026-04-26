import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Camera, AlertCircle, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useRef } from "react";

export function ReceiptScannerTesseract() {
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form state - manual data entry only
  const [formData, setFormData] = useState({
    checkNumber: "",
    address: "",
    phoneNumber: "",
    deliveryTime: "",
    enableDeliveryTime: false,
    area: "DN" as "DN" | "CP" | "B", // Default to DN
  });

  const createOrderMutation = trpc.orders.createFromReceipt.useMutation();

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        setReceiptImage(imageData);
        setLoading(false);
        toast.success("Receipt image selected. Please enter order details.");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Failed to load receipt image. Please try again.");
      setLoading(false);
    }
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleCamera = () => {
    cameraInputRef.current?.click();
  };

  const handleRescan = () => {
    setReceiptImage(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.checkNumber.trim()) {
      setError("Check Number is required");
      return;
    }
    if (!formData.address.trim()) {
      setError("Address is required");
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setError("Phone Number is required");
      return;
    }
    if (!receiptImage) {
      setError("Receipt image is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createOrderMutation.mutateAsync({
        orderNumber: formData.checkNumber,
        customerAddress: formData.address,
        customerPhone: formData.phoneNumber,
        area: formData.area as "DN" | "CP" | "B",
        deliveryTime: formData.enableDeliveryTime ? formData.deliveryTime : undefined,
        receiptText: "",
        receiptImage: receiptImage || "",
      });

      setSubmitSuccess(true);
      toast.success("Order submitted successfully!");
      
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
        setReceiptImage(null);
        setSubmitSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to submit order");
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
            <span>Order submitted successfully!</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Receipt Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Receipt Image</label>
            
            {!receiptImage ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUpload}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Photo
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCamera}
                    disabled={loading}
                    className="flex-1"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Upload or photograph the receipt for reference
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={receiptImage}
                    alt="Receipt preview"
                    className="w-full h-auto max-h-64 object-contain"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRescan}
                  className="w-full"
                >
                  Change Receipt Image
                </Button>
              </div>
            )}
          </div>

          {/* Check Number */}
          <div>
            <label className="block text-sm font-medium mb-2">Check Number *</label>
            <Input
              type="text"
              placeholder="Enter check number from receipt"
              value={formData.checkNumber}
              onChange={(e) => setFormData({ ...formData, checkNumber: e.target.value })}
              required
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium mb-2">Delivery Address *</label>
            <Input
              type="text"
              placeholder="Enter delivery address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium mb-2">Phone Number *</label>
            <Input
              type="tel"
              placeholder="Enter phone number"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              required
            />
          </div>

          {/* Area - Radio Buttons */}
          <div>
            <label className="block text-sm font-medium mb-2">Area *</label>
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

          {/* Delivery Time */}
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
            disabled={submitting || !receiptImage}
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
      </Card>
    </div>
  );
}
