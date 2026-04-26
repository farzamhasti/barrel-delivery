import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Upload, Camera, AlertCircle, CheckCircle2, Printer } from "lucide-react";
import Tesseract from "tesseract.js";

interface ExtractedReceipt {
  checkNumber: string;
  date: string;
  time: string;
  items: Array<{
    name: string;
    quantity: number;
  }>;
  deliveryAddress: string;
  deliveryTime: string;
}

export function ReceiptScannerTesseract() {
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [extractedReceipt, setExtractedReceipt] = useState<ExtractedReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const parseReceiptText = (text: string): ExtractedReceipt => {
    const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);

    let checkNumber = "";
    let date = "";
    let time = "";
    let deliveryAddress = "";
    let deliveryTime = "";
    const items: Array<{ name: string; quantity: number }> = [];

    // Common food/drink keywords
    const foodKeywords = [
      "pizza",
      "pasta",
      "lasagna",
      "wings",
      "salad",
      "burger",
      "sandwich",
      "soup",
      "bread",
      "appetizer",
      "entree",
      "dessert",
      "drink",
      "pepsi",
      "coke",
      "water",
      "juice",
      "beer",
      "wine",
      "coffee",
      "tea",
      "soda",
      "fries",
      "rice",
      "chicken",
      "beef",
      "fish",
      "shrimp",
      "vegetable",
      "sauce",
      "dressing",
    ];

    // Keywords to ignore
    const ignoreKeywords = [
      "training",
      "do not prepare",
      "subtotal",
      "tax",
      "total",
      "balance",
      "due",
      "paid",
      "change",
      "thank",
      "barrel",
      "delivery",
      "receipt",
      "check",
      "date",
      "time",
      "order",
      "items",
      "address",
    ];

    let inItemsSection = false;
    let inAddressSection = false;
    let lastItemIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Check for section headers
      if (lowerLine.includes("order items")) {
        inItemsSection = true;
        inAddressSection = false;
        continue;
      }
      if (lowerLine.includes("delivery address")) {
        inItemsSection = false;
        inAddressSection = true;
        continue;
      }

      // Extract check number
      if (lowerLine.includes("check") && lowerLine.includes("#")) {
        const match = line.match(/#?\s*(\d+)/);
        if (match) checkNumber = match[1];
      }

      // Extract date
      if (lowerLine.includes("date")) {
        const dateMatch = line.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
        if (dateMatch) date = dateMatch[0];
      }

      // Extract time
      if (lowerLine.includes("time") && !lowerLine.includes("delivery time")) {
        const timeMatch = line.match(/\d{1,2}:\d{2}\s*(am|pm|AM|PM)?/);
        if (timeMatch) time = timeMatch[0];
      }

      // Extract delivery time
      if (lowerLine.includes("delivery time")) {
        const timeMatch = line.match(/\d{1,2}:\d{2}\s*(am|pm|AM|PM)?/);
        if (timeMatch) deliveryTime = timeMatch[0];
      }

      // Extract delivery address
      if (inAddressSection && line.length > 0 && !lowerLine.includes("delivery")) {
        if (/^\d+/.test(line)) {
          // Line starts with a number (typical address format)
          deliveryAddress = line;
          inAddressSection = false;
        }
      }

      // Extract items
      if (inItemsSection && line.length > 0 && !lowerLine.includes("order items")) {
        const isFoodItem = foodKeywords.some((keyword) => lowerLine.includes(keyword));
        const shouldIgnore = ignoreKeywords.some((keyword) => lowerLine.includes(keyword));

        if (isFoodItem && !shouldIgnore) {
          // Check if this line is a modifier (indented or short)
          const isModifier = line.startsWith(" ") || line.startsWith("-") || line.length < 20;

          if (isModifier && lastItemIndex >= 0) {
            // Add as modifier to last item
            items[lastItemIndex].name += ` (${line.replace(/^[\s\-]+/, "").trim()})`;
          } else {
            // Parse quantity
            let quantity = 1;
            const quantityMatch = line.match(/x(\d+)|(\d+)\s*x/i);
            if (quantityMatch) {
              quantity = parseInt(quantityMatch[1] || quantityMatch[2]);
            }

            const itemName = line
              .replace(/x\d+/gi, "")
              .replace(/\(\d+\)/g, "")
              .replace(/^[\s\-]+/, "")
              .trim();

            if (itemName.length > 0) {
              items.push({ name: itemName, quantity });
              lastItemIndex = items.length - 1;
            }
          }
        }
      }
    }

    return {
      checkNumber,
      date,
      time,
      items,
      deliveryAddress,
      deliveryTime,
    };
  };

  const handleImageCapture = async (file: File) => {
    try {
      setLoading(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        setReceiptImage(imageData);

        try {
          const result = await Tesseract.recognize(file, "eng");
          const text = result.data.text;

          if (!text || text.trim().length === 0) {
            setError("Could not read receipt — please try again with a clearer photo");
            setLoading(false);
            return;
          }

          const receipt = parseReceiptText(text);

          if (receipt.items.length === 0) {
            setError("Could not find any items on the receipt — please try again with a clearer photo");
            setLoading(false);
            return;
          }

          setExtractedReceipt(receipt);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to read receipt");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process image");
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }
      handleImageCapture(file);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageCapture(file);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleScanAgain = () => {
    setReceiptImage(null);
    setExtractedReceipt(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  if (loading) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center min-h-96">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <p className="text-lg font-semibold">Reading receipt...</p>
        <p className="text-sm text-gray-500 mt-2">Processing with OCR</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-700 mb-2">Could not read receipt</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-600 mb-4">Please try again with a clearer photo.</p>
            <Button onClick={handleScanAgain} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!extractedReceipt) {
    return (
      <Card className="p-8">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Scan Aloha Receipt</h2>
          <p className="text-sm text-gray-600">Upload or take a photo of the Aloha receipt to generate a delivery receipt</p>

          <div className="flex gap-4">
            <Button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1"
              variant="outline"
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Image
            </Button>
          </div>

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
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-500" />
          <h2 className="text-xl font-semibold">Delivery Receipt</h2>
        </div>
        <Button onClick={handlePrint} size="sm" className="print:hidden">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Printable Receipt */}
      <div className="bg-white p-8 border-2 border-gray-300 rounded-lg font-mono text-sm max-w-md mx-auto">
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold">BARREL DELIVERY</h3>
          <p className="text-xs">DELIVERY RECEIPT</p>
        </div>

        <div className="border-t border-b border-gray-400 py-3 mb-4">
          <div className="flex justify-between mb-2">
            <span>Check #:</span>
            <span className="font-bold">{extractedReceipt.checkNumber || "N/A"}</span>
          </div>
          {extractedReceipt.date && (
            <div className="flex justify-between mb-2">
              <span>Date:</span>
              <span>{extractedReceipt.date}</span>
            </div>
          )}
          {extractedReceipt.time && (
            <div className="flex justify-between">
              <span>Time:</span>
              <span>{extractedReceipt.time}</span>
            </div>
          )}
        </div>

        <div className="mb-4">
          <h4 className="font-bold mb-2">ORDER ITEMS:</h4>
          {extractedReceipt.items.map((item, index) => (
            <div key={index} className="text-xs mb-1">
              - {item.name} {item.quantity > 1 ? `x${item.quantity}` : ""}
            </div>
          ))}
        </div>

        <div className="border-t border-b border-gray-400 py-3 mb-4">
          <h4 className="font-bold mb-2">DELIVERY ADDRESS:</h4>
          <p className="text-xs">{extractedReceipt.deliveryAddress || "N/A"}</p>
        </div>

        {extractedReceipt.deliveryTime && (
          <div className="mb-4">
            <div className="flex justify-between">
              <span>Delivery Time:</span>
              <span className="font-bold">{extractedReceipt.deliveryTime}</span>
            </div>
          </div>
        )}

        <div className="text-center text-xs mt-6 pt-4 border-t border-gray-400">
          <p>Thank you!</p>
        </div>
      </div>

      <div className="flex gap-2 mt-6 print:hidden">
        <Button onClick={handleScanAgain} variant="outline" className="flex-1">
          Scan Again
        </Button>
      </div>
    </Card>
  );
}
