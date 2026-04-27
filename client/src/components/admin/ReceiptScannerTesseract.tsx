import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2, Camera, Upload, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";

export function ReceiptScannerTesseract() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Form state
  const [formData, setFormData] = useState<{ 
    checkNumber: string; 
    address: string; 
    phoneNumber: string; 
    deliveryTime: string; 
    enableDeliveryTime: boolean; 
    area: "DT" | "CP" | "B"; 
    receiptImage: string 
  }>({
    checkNumber: "",
    address: "",
    phoneNumber: "",
    deliveryTime: "",
    enableDeliveryTime: false,
    area: "DT",
    receiptImage: "",
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [convertedReceiptHTML, setConvertedReceiptHTML] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const createOrderMutation = trpc.orders.createFromReceipt.useMutation();
  const convertReceiptMutation = trpc.orders.convertReceiptImage.useMutation();

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start camera with multiple fallback strategies
  const startCamera = async () => {
    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Your browser does not support camera access. Please use a modern browser (Chrome, Safari, Firefox, Edge).");
        return;
      }

      setError(null);
      setLoading(true);

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      let stream: MediaStream | null = null;
      const errors: string[] = [];

      // Strategy 1: Try with ideal constraints (best quality)
      try {
        console.log("Attempting camera access with ideal constraints...");
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
          audio: false,
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("✓ Camera accessed with ideal constraints");
      } catch (err: any) {
        errors.push(`Ideal constraints failed: ${err.name}`);
        console.log("Ideal constraints failed, trying basic constraints...", err);

        // Strategy 2: Try with basic constraints
        try {
          console.log("Attempting camera access with basic constraints...");
          const basicConstraints: MediaStreamConstraints = {
            video: {
              facingMode: "environment",
            },
            audio: false,
          };
          stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
          console.log("✓ Camera accessed with basic constraints");
        } catch (err2: any) {
          errors.push(`Basic constraints failed: ${err2.name}`);
          console.log("Basic constraints failed, trying minimal constraints...", err2);

          // Strategy 3: Try with minimal constraints (just video: true)
          try {
            console.log("Attempting camera access with minimal constraints...");
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            console.log("✓ Camera accessed with minimal constraints");
          } catch (err3: any) {
            errors.push(`Minimal constraints failed: ${err3.name}`);
            console.error("All camera strategies failed:", err3);
            throw err3;
          }
        }
      }

      if (!stream) {
        throw new Error("Failed to get camera stream");
      }

      // Store stream reference for cleanup
      streamRef.current = stream;

      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded, attempting to play...");
          videoRef.current?.play()
            .then(() => {
              console.log("✓ Video playing successfully");
              setCameraActive(true);
              setShowCamera(true);
              setError(null);
            })
            .catch(err => {
              console.error("Error playing video:", err);
              setError("Failed to start camera playback. Please try again.");
              setCameraActive(false);
            });
        };

        videoRef.current.onerror = (err) => {
          console.error("Video element error:", err);
          setError("Camera video error. Please try again.");
          setCameraActive(false);
        };
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraActive(false);

      // Provide specific error messages
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("📱 Camera permission denied. Please:\n1. Go to Settings\n2. Find this app/browser\n3. Enable Camera permission\n4. Refresh the page and try again");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError("❌ No camera found on your device. Please use a device with a camera.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setError("⚠️ Camera is in use by another app. Please close other apps using the camera and try again.");
      } else if (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError") {
        setError("⚠️ Camera constraints not supported. Please try again.");
      } else if (err.name === "TypeError") {
        setError("❌ Camera access error. Make sure you're using HTTPS and a modern browser.");
      } else {
        setError(`Camera error: ${err.message || err.name || "Unknown error"}. Please try again or use Upload Photo instead.`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError("Camera not ready. Please try again.");
      return;
    }

    try {
      const context = canvasRef.current.getContext("2d");
      if (!context) {
        setError("Failed to capture photo. Please try again.");
        return;
      }

      // Set canvas size to match video
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;

      // Draw video frame to canvas
      context.drawImage(videoRef.current, 0, 0);

      // Get image data
      const imageData = canvasRef.current.toDataURL("image/jpeg", 0.9);
      setFormData({ ...formData, receiptImage: imageData });
      setImagePreview(imageData);
      stopCamera();
      
      // Convert receipt using LLM
      convertReceiptImage(imageData);
      toast.success("Photo captured successfully!");
    } catch (err: any) {
      console.error("Capture error:", err);
      setError("Failed to capture photo. Please try again.");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("Camera track stopped");
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
    setCameraActive(false);
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
        convertReceiptImage(imageData);
        toast.success("Photo uploaded successfully!");
      };
      reader.onerror = () => {
        setError("Failed to read file. Please try again.");
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
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 whitespace-pre-line">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
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
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Opening Camera...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                    </>
                  )}
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
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full aspect-video object-cover"
                  />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-4">
                  <Button 
                    type="button" 
                    onClick={capturePhoto}
                    disabled={!cameraActive}
                    className="flex-1"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capture Photo
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={stopCamera}
                    className="flex-1"
                  >
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
