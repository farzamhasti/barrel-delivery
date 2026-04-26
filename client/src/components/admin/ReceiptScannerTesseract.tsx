import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, CheckCircle2, Camera, Upload, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useRef } from "react";

export function ReceiptScannerTesseract() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    checkNumber: "",
    address: "",
    phoneNumber: "",
    deliveryTime: "",
    enableDeliveryTime: false,
    area: "DN" as "DN" | "CP" | "B",
    receiptImage: "" as string, // Base64 image
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const createOrderMutation = trpc.orders.createFromReceipt.useMutation();

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (err) {
      setError("Unable to access camera. Please check permissions.");
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const imageData = canvasRef.current.toDataURL("image/jpeg");
        setFormData({ ...formData, receiptImage: imageData });
        setImagePreview(imageData);
        stopCamera();
      }
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setShowCamera(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setFormData({ ...formData, receiptImage: imageData });
        setImagePreview(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear image
  const clearImage = () => {
    setFormData({ ...formData, receiptImage: "" });
    setImagePreview(null);
  };

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
        customerPhone: formData.phoneNumber || "",
        area: formData.area as "DN" | "CP" | "B",
        deliveryTime: formData.enableDeliveryTime ? formData.deliveryTime : undefined,
        receiptText: "",
        receiptImage: formData.receiptImage, // Base64 image
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
          receiptImage: "",
        });
        setImagePreview(null);
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
          {/* Receipt Image Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
            <h3 className="font-semibold mb-4">Receipt Image (Optional)</h3>

            {!showCamera && !imagePreview && (
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={startCamera}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {showCamera && (
              <div className="space-y-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg bg-black"
                />
                <canvas ref={canvasRef} className="hidden" width={640} height={480} />
                <div className="flex gap-4">
                  <Button type="button" onClick={capturePhoto} className="flex-1">
                    <Camera className="w-4 h-4 mr-2" />
                    Capture
                  </Button>
                  <Button type="button" variant="outline" onClick={stopCamera} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {imagePreview && (
              <div className="space-y-4">
                <img src={imagePreview} alt="Receipt preview" className="w-full rounded-lg" />
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearImage}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove Photo
                  </Button>
                  <Button
                    type="button"
                    onClick={startCamera}
                    variant="outline"
                    className="flex-1"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                </div>
              </div>
            )}
          </div>

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
            <label className="block text-sm font-medium mb-2">Area (Optional)</label>
            <div className="flex gap-6">
              {["DN", "CP", "B"].map((areaOption) => (
                <label key={areaOption} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="area"
                    value={areaOption}
                    checked={formData.area === areaOption}
                    onChange={(e) =>
                      setFormData({ ...formData, area: e.target.value as "DN" | "CP" | "B" })
                    }
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
          <Button type="submit" disabled={submitting} className="w-full">
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
