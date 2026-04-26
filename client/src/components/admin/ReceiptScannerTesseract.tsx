import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Camera, AlertCircle, CheckCircle2 } from "lucide-react";
import Tesseract from "tesseract.js";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";

interface ExtractedItems {
  items: string[];
  rawText: string;
}

export function ReceiptScannerTesseract() {
  const { toast } = useToast();
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<ExtractedItems | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form state - exactly as specified
  const [formData, setFormData] = useState({
    orderNumber: "",
    address: "",
    phoneNumber: "",
    deliveryTime: "",
    enableDeliveryTime: false,
    area: "DN", // Default to DN
  });

  const createOrderMutation = trpc.orders.createFromReceipt.useMutation();

  // Extract food/drink items from receipt text
  const extractItems = (text: string): string[] => {
    const lines = text.split("\n");
    const items: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Look for lines with quantities and item names
      // Pattern: number + item name (with optional modifiers in parentheses)
      const match = trimmed.match(/^(\d+)\s*x?\s*(.+?)(?:\s*\(.*?\))?$/i);
      if (match) {
        const quantity = match[1];
        const itemName = match[2].trim();
        // Filter out common non-item lines
        if (itemName.length > 2 && !itemName.match(/^(subtotal|tax|total|amount|check|date|time)/i)) {
          items.push(`${itemName} x${quantity}`);
        }
      }
    }
    
    return items.length > 0 ? items : [];
  };

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

        // Run OCR
        const result = await Tesseract.recognize(imageData, "eng", {
          logger: (m) => console.log("OCR Progress:", m),
        });

        const text = result.data.text;
        const items = extractItems(text);
        
        setExtractedItems({
          items,
          rawText: text,
        });
        
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Failed to scan receipt. Please try again.");
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
    setExtractedItems(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.orderNumber.trim()) {
      setError("Order Number is required");
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
        orderNumber: formData.orderNumber,
        address: formData.address,
        phoneNumber: formData.phoneNumber,
        area: formData.area,
        deliveryTime: formData.enableDeliveryTime ? formData.deliveryTime : undefined,
        receiptText: extractedItems?.rawText || "",
        receiptImage: receiptImage || "",
      });

      setSubmitSuccess(true);
      toast.success("Order submitted successfully!");
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          orderNumber: "",
          address: "",
          phoneNumber: "",
          deliveryTime: "",
          enableDeliveryTime: false,
          area: "DN",
        });
        setReceiptImage(null);
        setExtractedItems(null);
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
        <h2 className="text-2xl font-bold mb-6">New Order</h2>

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
          {/* Order Number */}
          <div>
            <label className="block text-sm font-medium mb-2">Order Number</label>
            <Input
              type="text"
              placeholder="Enter order number"
              value={formData.orderNumber}
              onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
              required
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium mb-2">Address</label>
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
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <Input
              type="tel"
              placeholder="Enter phone number"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
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
              Delivery Time
            </label>
            {formData.enableDeliveryTime && (
              <Input
                type="time"
                value={formData.deliveryTime}
                onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
              />
            )}
          </div>

          {/* Area - Radio Buttons */}
          <div>
            <label className="block text-sm font-medium mb-2">Area</label>
            <div className="flex gap-6">
              {["DN", "CP", "B"].map((areaOption) => (
                <label key={areaOption} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="area"
                    value={areaOption}
                    checked={formData.area === areaOption}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{areaOption}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Receipt Scan */}
          <div>
            <label className="block text-sm font-medium mb-2">Receipt Scan</label>
            
            {!extractedItems ? (
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
                        Scanning...
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
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        Take Photo
                      </>
                    )}
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Extracted Items:</h4>
                  <ul className="space-y-1">
                    {extractedItems.items.length > 0 ? (
                      extractedItems.items.map((item, idx) => (
                        <li key={idx} className="text-sm text-gray-700">
                          - {item}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-gray-500">No items extracted</li>
                    )}
                  </ul>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRescan}
                  className="w-full"
                >
                  Rescan
                </Button>
              </div>
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
                Submitting...
              </>
            ) : (
              "Submit Order"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
