import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2, Camera, Upload, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { processReceiptImage } from "@/lib/receiptImageProcessor";
import { getAddressSuggestions } from "@/lib/addressSuggestions";

export function ReceiptScannerTesseract() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state - only manual input fields
  const [formData, setFormData] = useState({
    checkNumber: "",
    address: "",
    phoneNumber: "",
    deliveryTime: "",
    enableDeliveryTime: false,
    area: "Downtown" as "Downtown" | "Central Park" | "Both",
    receiptImage: "",
  });

  const [placeCoordinates, setPlaceCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{ address: string; lat: number; lng: number }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Handle address input with suggestions
  const handleAddressInputChange = (value: string) => {
    setFormData({ ...formData, address: value });
    
    if (value.length >= 2) {
      const suggestions = getAddressSuggestions(value);
      setAddressSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle address selection from suggestions
  const handleAddressSelect = (suggestion: { address: string; lat: number; lng: number }) => {
    setFormData({ ...formData, address: suggestion.address });
    setPlaceCoordinates({ lat: suggestion.lat, lng: suggestion.lng });
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  const createOrderMutation = trpc.orders.createFromReceipt.useMutation();

  // Handle camera capture
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageData = event.target?.result as string;
        setIsProcessing(true);
        try {
          const processedImage = await processReceiptImage(imageData);
          setFormData({ ...formData, receiptImage: processedImage });
          setImagePreview(processedImage);
          toast.success("Photo captured and processed successfully!");
        } catch (err) {
          console.error("Image processing error:", err);
          setFormData({ ...formData, receiptImage: imageData });
          setImagePreview(imageData);
          toast.info("Photo captured. Processing skipped.");
        } finally {
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        setError("Failed to read file. Please try again.");
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageData = event.target?.result as string;
        setIsProcessing(true);
        try {
          const processedImage = await processReceiptImage(imageData);
          setFormData({ ...formData, receiptImage: processedImage });
          setImagePreview(processedImage);
          toast.success("Photo uploaded and processed successfully!");
        } catch (err) {
          console.error("Image processing error:", err);
          setFormData({ ...formData, receiptImage: imageData });
          setImagePreview(imageData);
          toast.info("Photo uploaded. Processing skipped.");
        } finally {
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        setError("Failed to read file. Please try again.");
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  // Remove image
  const removeImage = () => {
    setFormData({ ...formData, receiptImage: "", });
    setImagePreview(null);
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
          area: "Downtown" as "Downtown" | "Central Park" | "Both",
          receiptImage: "",
        });
        setImagePreview(null);
        setSubmitSuccess(false);
        setPlaceCoordinates(null);
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

            {!imagePreview && (
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
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
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraCapture}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {imagePreview && !isProcessing && (
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
                    Retake
                  </Button>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing image...</span>
              </div>
            )}
          </div>

          {/* Manual Input Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Check Number</label>
              <Input
                type="text"
                placeholder="Enter check number"
                value={formData.checkNumber}
                onChange={(e) => setFormData({ ...formData, checkNumber: e.target.value })}
                required
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium mb-1">Address</label>
              <Input
                id="address-input"
                type="text"
                placeholder="Enter delivery address"
                value={formData.address}
                onChange={(e) => handleAddressInputChange(e.target.value)}
                onFocus={() => formData.address.length >= 2 && setShowSuggestions(true)}
                autoComplete="off"
                required
              />
              
              {/* Address Suggestions Dropdown */}
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {addressSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleAddressSelect(suggestion)}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0 text-sm"
                    >
                      {suggestion.address}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <Input
                type="tel"
                placeholder="Enter phone number"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Area</label>
              <div className="flex flex-wrap gap-4">
                {(['Downtown', 'Central Park', 'Both'] as const).map((areaOption) => (
                  <label key={areaOption} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="area"
                      value={areaOption}
                      checked={formData.area === areaOption}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value as "Downtown" | "Central Park" | "Both" })}
                      className="w-4 h-4 text-blue-600 cursor-pointer"
                    />
                    <span className="text-sm">{areaOption}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableDeliveryTime"
                checked={formData.enableDeliveryTime}
                onChange={(e) => setFormData({ ...formData, enableDeliveryTime: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="enableDeliveryTime" className="text-sm font-medium">
                Set Delivery Time
              </label>
            </div>

            {formData.enableDeliveryTime && (
              <div>
                <label className="block text-sm font-medium mb-1">Delivery Time</label>
                <Input
                  type="datetime-local"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting || !formData.checkNumber || !formData.address}
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
