import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2, Camera, Upload, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { extractReceiptFromImage } from "@/lib/tesseractOcr";
import { parseReceiptText, formatParsedReceipt } from "@/lib/receiptParser";

export function ReceiptScannerTesseract() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle camera capture using native file input with capture attribute
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setFormData({ ...formData, receiptImage: imageData });
        setImagePreview(imageData);
        convertReceiptImage(imageData);
        toast.success("Photo captured successfully!");
      };
      reader.onerror = () => {
        setError("Failed to read file. Please try again.");
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be captured again
    e.target.value = "";
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
    // Reset input so same file can be uploaded again
    e.target.value = "";
  };

  // Convert receipt image using Tesseract.js OCR (browser-based, no API calls)
  const convertReceiptImage = async (imageData: string) => {
    setIsConverting(true);
    try {
      // Extract text using Tesseract.js (runs in browser)
      const ocrText = await extractReceiptFromImage(imageData);
      
      // Parse the extracted text
      const parsed = parseReceiptText(ocrText);
      
      // Format for display
      const formatted = formatParsedReceipt(parsed);
      setConvertedReceiptHTML(formatted);
      
      // Auto-fill check number if found
      if (parsed.checkNumber) {
        setFormData(prev => ({ ...prev, checkNumber: parsed.checkNumber || "" }));
      }
    } catch (err: any) {
      console.error("OCR error:", err);
      setError("Failed to read receipt. Please check the image quality.");
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

            {imagePreview && !isConverting && (
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
              <span>Reading receipt with OCR...</span>
            </div>
          )}

          {convertedReceiptHTML && (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-3">Receipt Data (OCR Extracted)</h3>
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

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Order...
              </>
            ) : (
              "Create Order"
            )}
          </Button>

          {submitting && (
            <p className="text-center text-sm text-gray-500">
              Required fields: Check Number, Address
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}
