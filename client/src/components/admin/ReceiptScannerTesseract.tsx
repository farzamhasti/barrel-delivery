import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const [formData, setFormData] = useState<{ checkNumber: string; address: string; phoneNumber: string; deliveryTime: string; enableDeliveryTime: boolean; area: "DT" | "CP" | "B"; receiptImage: string }>({
    checkNumber: "",
    address: "",
    phoneNumber: "",
    deliveryTime: "",
    enableDeliveryTime: false,
    area: "DT",
    receiptImage: "",
  })


  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [convertedReceiptHTML, setConvertedReceiptHTML] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const createOrderMutation = trpc.orders.createFromReceipt.useMutation();
  const convertReceiptMutation = trpc.orders.convertReceiptImage.useMutation();

  // Start camera with improved error handling and fallback constraints
  const startCamera = async () => {
    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Your browser does not support camera access.");
        return;
      }

      setError(null); // Clear any previous errors
      
      // Try with preferred constraints first
      const preferredConstraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
      } catch (err: any) {
        // Fallback to basic constraints if preferred constraints fail
        console.log("Preferred constraints failed, trying basic constraints...", err);
        const basicConstraints: MediaStreamConstraints = {
          video: true,
          audio: false,
        };
        stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(err => {
            console.error("Error playing video:", err);
            setError("Failed to start camera playback.");
          });
        };
        setShowCamera(true);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setError("Camera permission denied. Please go to Settings > Permissions and allow camera access.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found on your device.");
      } else if (err.name === "NotReadableError") {
        setError("Camera is already in use by another application. Please close other apps using the camera.");
      } else if (err.name === "OverconstrainedError") {
        setError("Camera constraints not supported. Please try again.");
      } else {
        setError(`Camera error: ${err.message || "Unable to access camera. Please check permissions."}`);
      }
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
        // Convert receipt using LLM
        convertReceiptImage(imageData);
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
        // Convert receipt using LLM
        convertReceiptImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  // Convert receipt image using LLM
  const convertReceiptImage = async (imageData: string) => {
    setIsConverting(true);
    try {
      const result = await convertReceiptMutation.mutateAsync({ imageData });
      setConvertedReceiptHTML(result.html);
    } catch (err: any) {
      console.error("Conversion error:", err);
      setError("Failed to convert receipt. Please try again.");
    } finally {
      setIsConverting(false);
    }
  };

  // Remove image
  const removeImage = () => {
    setFormData({ ...formData, receiptImage: "" });
    setImagePreview(null);
    setConvertedReceiptHTML(null);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await createOrderMutation.mutateAsync({
        orderNumber: formData.checkNumber,
        customerAddress: formData.address,
        customerPhone: formData.phoneNumber || "",
        deliveryTime: formData.enableDeliveryTime ? formData.deliveryTime : undefined,
        area: formData.area,
        receiptImage: formData.receiptImage,
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
          area: "DT" as "DT" | "CP" | "B",
          receiptImage: "",
        });
        setImagePreview(null);
        setConvertedReceiptHTML(null);
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

            {imagePreview && !showCamera && (
              <div className="space-y-4">
                <img src={imagePreview} alt="Receipt preview" className="w-full rounded-lg" />
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={removeImage}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Converted Receipt Preview */}
          {isConverting && (
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Converting receipt...</span>
            </div>
          )}

          {convertedReceiptHTML && (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-3">Converted Receipt Preview</h3>
              <pre className="text-xs whitespace-pre-wrap font-mono overflow-auto max-h-48">
                {convertedReceiptHTML}
              </pre>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
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

            <div>
              <label className="block text-sm font-medium mb-1">
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

            <div>
              <label className="block text-sm font-medium mb-1">Phone Number (Optional)</label>
              <Input
                type="tel"
                placeholder="Enter phone number (optional)"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Area (Optional)</label>
              <div className="flex gap-4">
                {["DT", "CP", "B"].map((areaOption) => (
                  <label key={areaOption} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="area"
                      value={areaOption}
                      checked={formData.area === areaOption}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value as "DT" | "CP" | "B" })}
                    />
                    {areaOption}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="deliveryTime"
                checked={formData.enableDeliveryTime}
                onChange={(e) => setFormData({ ...formData, enableDeliveryTime: e.target.checked })}
              />
              <label htmlFor="deliveryTime" className="text-sm font-medium">
                Set Delivery Time (Optional)
              </label>
            </div>

            {formData.enableDeliveryTime && (
              <Input
                type="datetime-local"
                value={formData.deliveryTime}
                onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
              />
            )}
          </div>

          <Button type="submit" className="w-full" disabled={submitting || loading}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Order...
              </>
            ) : (
              "Create Order"
            )}
          </Button>

          {(loading || submitting) && (
            <p className="text-center text-sm text-gray-500">
              Required fields: Check Number, Address
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}
