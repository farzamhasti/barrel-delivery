import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Camera, AlertCircle, CheckCircle2, Printer } from "lucide-react";
import Tesseract from "tesseract.js";
import { trpc } from "@/lib/trpc";

interface ExtractedReceipt {
  checkNumber: string;
  receiptImage: string;
}

export function ReceiptScannerTesseract() {
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [extractedReceipt, setExtractedReceipt] = useState<ExtractedReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Editable form state - 4 manual fields
  const [formData, setFormData] = useState({
    deliveryAddress: "",
    phoneNumber: "",
    area: "",
    deliveryTime: "",
    enableDeliveryTime: false,
  });

  const createOrderMutation = trpc.orders.createFromReceipt.useMutation();

  const extractCheckNumber = (text: string): string => {
    // Look for check number pattern like "Check: 40134" or "Check #: 40134"
    const match = text.match(/check\s*[#:]?\s*(\d{4,5})/i);
    return match ? match[1] : "";
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Read image for display
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        setReceiptImage(imageData);

        // Extract text using Tesseract
        const { data: { text } } = await Tesseract.recognize(file, "eng");
        
        // Extract check number only
        const checkNumber = extractCheckNumber(text);

        if (!checkNumber) {
          setError("Could not find check number on receipt — please try again with a clearer photo");
          setLoading(false);
          return;
        }

        setExtractedReceipt({
          checkNumber,
          receiptImage: imageData,
        });

        // Reset form data for manual entry
        setFormData({
          deliveryAddress: "",
          phoneNumber: "",
          area: "",
          deliveryTime: "",
          enableDeliveryTime: false,
        });

        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Failed to process receipt — please try again");
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFormChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitOrder = async () => {
    // Validate required fields
    if (!formData.deliveryAddress.trim()) {
      setError("Delivery address is required");
      return;
    }

    if (!extractedReceipt?.checkNumber) {
      setError("Check number is missing");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createOrderMutation.mutateAsync({
        checkNumber: extractedReceipt.checkNumber,
        area: formData.area,
        deliveryTime: formData.enableDeliveryTime && formData.deliveryTime ? formData.deliveryTime : "",
        hasDeliveryTime: formData.enableDeliveryTime,
        notes: `Phone: ${formData.phoneNumber || "Unknown"}`,
        phoneNumber: formData.phoneNumber,
        region: formData.area,
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        setReceiptImage(null);
        setExtractedReceipt(null);
        setSubmitSuccess(false);
        setFormData({
          deliveryAddress: "",
          phoneNumber: "",
          area: "",
          deliveryTime: "",
          enableDeliveryTime: false,
        });
      }, 2000);
    } catch (err) {
      setError("Failed to submit order — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleScanAgain = () => {
    setReceiptImage(null);
    setExtractedReceipt(null);
    setError(null);
    setFormData({
      deliveryAddress: "",
      phoneNumber: "",
      area: "",
      deliveryTime: "",
      enableDeliveryTime: false,
    });
  };

  // Initial upload screen
  if (!receiptImage) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-2">Aloha Receipt Scanner</h2>
          <p className="text-gray-600 mb-6">Scan receipts and generate delivery orders</p>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6 hover:border-blue-500 transition">
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-700 mb-4">Upload or take a photo of the Aloha receipt</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={handleUploadClick} variant="default">
                Upload Photo
              </Button>
              <Button onClick={handleCameraClick} variant="outline">
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Loading screen
  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-500 mb-4" />
          <p className="text-lg font-semibold">Reading receipt...</p>
        </Card>
      </div>
    );
  }

  // Success screen
  if (submitSuccess) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <p className="text-lg font-semibold text-green-700">Order submitted successfully!</p>
        </Card>
      </div>
    );
  }

  // Receipt display and form screen
  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Receipt Image */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Scanned Receipt</h3>
          {receiptImage && (
            <img src={receiptImage} alt="Receipt" className="w-full rounded-lg border border-gray-200" />
          )}
        </Card>

        {/* Order Form */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Order Details</h3>

          {/* Check Number (Display Only) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Check #</label>
            <div className="p-3 bg-gray-100 rounded border border-gray-300 text-gray-900 font-semibold">
              {extractedReceipt?.checkNumber || "N/A"}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Address <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="Enter delivery address"
              value={formData.deliveryAddress}
              onChange={(e) => handleFormChange("deliveryAddress", e.target.value)}
              className="w-full"
            />
          </div>

          {/* Phone Number */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
            <Input
              type="tel"
              placeholder="Enter phone number"
              value={formData.phoneNumber}
              onChange={(e) => handleFormChange("phoneNumber", e.target.value)}
              className="w-full"
            />
          </div>

          {/* Area/Region */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
            <select
              value={formData.area}
              onChange={(e) => handleFormChange("area", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a region</option>
              <option value="DN">DN</option>
              <option value="CP">CP</option>
              <option value="B">B</option>
            </select>
          </div>

          {/* Delivery Time */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="enableDeliveryTime"
                checked={formData.enableDeliveryTime}
                onChange={(e) => handleFormChange("enableDeliveryTime", e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="enableDeliveryTime" className="text-sm font-medium text-gray-700">
                Specific Delivery Time
              </label>
            </div>
            {formData.enableDeliveryTime && (
              <Input
                type="time"
                value={formData.deliveryTime}
                onChange={(e) => handleFormChange("deliveryTime", e.target.value)}
                className="w-full"
              />
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded mb-4 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
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
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleScanAgain} variant="outline" className="flex-1">
              Scan Again
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
