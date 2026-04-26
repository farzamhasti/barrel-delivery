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
      "pizza", "pasta", "lasagna", "wings", "salad", "burger", "sandwich", "soup",
      "bread", "appetizer", "entree", "dessert", "drink", "pepsi", "coke", "water",
      "juice", "beer", "wine", "coffee", "tea", "soda", "fries", "rice", "chicken",
      "beef", "fish", "shrimp", "vegetable", "sauce", "dressing", "mild", "spicy",
      "hot", "cold", "diet", "sprite", "fanta", "orange", "lemonade"
    ];

    // Keywords to ignore
    const ignoreKeywords = [
      "training", "do not prepare", "subtotal", "tax", "total", "balance",
      "due", "paid", "change", "thank", "barrel", "delivery", "receipt",
      "date", "order", "address", "check", "guests", "server", "table"
    ];

    let lastItemIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Mark when we find BAR section (delivery address follows)
      if (lowerLine === "bar") {
        // Next line should be the delivery address
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (/^\d+/.test(nextLine)) {
            deliveryAddress = nextLine;
          }
        }
        continue;
      }

      // Extract check number
      if (lowerLine.includes("check") && lowerLine.includes(":")) {
        const match = line.match(/(\d{4,5})/);
        if (match) checkNumber = match[1];
      }

      // Extract date and time from same line
      const dateTimeMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?)/);
      if (dateTimeMatch) {
        date = dateTimeMatch[1];
        time = dateTimeMatch[2];
      }

      // Extract delivery time (if it appears separately)
      if (lowerLine.includes("delivery time") || lowerLine.includes("delivery:")) {
        const timeMatch = line.match(/(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?)/);
        if (timeMatch) deliveryTime = timeMatch[1];
      }

      // Extract items - look for food keywords anywhere in the text
      const isFoodItem = foodKeywords.some((keyword) => lowerLine.includes(keyword));
      const shouldIgnore = ignoreKeywords.some((keyword) => lowerLine.includes(keyword));

      if (isFoodItem && !shouldIgnore && line.length > 0) {
        // Check if this line is a modifier (very short or contains common modifiers)
        const modifierKeywords = ["mild", "spicy", "hot", "cold", "extra", "light", "heavy"];
        const isModifier = modifierKeywords.some((mod) => lowerLine.includes(mod)) && line.length < 30;

        if (isModifier && lastItemIndex >= 0) {
          // Add as modifier to last item
          items[lastItemIndex].name += ` (${line})`;
        } else {
          // Parse quantity - handle formats like "*10*" or "x10" or "(10)"
          let quantity = 1;
          const quantityMatch = line.match(/\*(\d+)\*|x(\d+)|x\s*(\d+)|\((\d+)\)/i);
          if (quantityMatch) {
            quantity = parseInt(quantityMatch[1] || quantityMatch[2] || quantityMatch[3] || quantityMatch[4]);
          }

          // Clean up the item name
          const itemName = line
            .replace(/\*(\d+)\*/g, "")
            .replace(/x\s*\d+/gi, "")
            .replace(/\(\d+\)/g, "")
            .trim();

          if (itemName.length > 0 && itemName !== "bar") {
            // Check if this is a duplicate of the last item
            if (lastItemIndex >= 0 && items[lastItemIndex].name === itemName) {
              items[lastItemIndex].quantity += quantity;
            } else {
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

        // Use Tesseract to extract text
        const { data } = await Tesseract.recognize(imageData, "eng");
        const extractedText = data.text;

        // Parse the extracted text
        const receipt = parseReceiptText(extractedText);

        // Check if we found any items
        if (receipt.items.length === 0) {
          setError("Could not find any items on the receipt — please try again with a clearer photo");
          setExtractedReceipt(null);
        } else {
          setExtractedReceipt(receipt);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Failed to process receipt image");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Aloha Receipt Scanner</h1>
        <p className="text-gray-600">Scan receipts and generate delivery slips</p>
      </div>

      {!extractedReceipt ? (
        <Card className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-gray-600">Reading receipt...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <p className="text-red-600 font-semibold">Could not read receipt</p>
              <p className="text-gray-600 text-center">{error}</p>
              <Button onClick={handleScanAgain} variant="outline">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-gray-600 mb-6">Upload or take a photo of the Aloha receipt</p>
              
              <div className="flex gap-4">
                <label className="flex-1">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="font-semibold">Upload Photo</p>
                    <p className="text-sm text-gray-500">Click to select a file</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <label className="flex-1">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
                    <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="font-semibold">Take Photo</p>
                    <p className="text-sm text-gray-500">Use your camera</p>
                  </div>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraCapture}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-8">
          <div className="space-y-6">
            {/* Printable Receipt */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-8 space-y-4 print:border-0">
              <div className="text-center border-b-2 border-gray-300 pb-4">
                <p className="text-sm font-semibold">BARREL DELIVERY</p>
                <p className="text-sm">DELIVERY RECEIPT</p>
              </div>

              {extractedReceipt.checkNumber && (
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Check #:</span>
                  <span>{extractedReceipt.checkNumber}</span>
                </div>
              )}

              {extractedReceipt.date && (
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Date:</span>
                  <span>{extractedReceipt.date}</span>
                </div>
              )}

              {extractedReceipt.time && (
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Time:</span>
                  <span>{extractedReceipt.time}</span>
                </div>
              )}

              <div className="border-t-2 border-b-2 border-gray-300 py-4">
                <p className="font-semibold text-sm mb-2">ORDER ITEMS:</p>
                <div className="space-y-1">
                  {extractedReceipt.items.map((item, idx) => (
                    <div key={idx} className="text-sm flex justify-between">
                      <span>- {item.name}</span>
                      <span>x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {extractedReceipt.deliveryAddress && (
                <div className="space-y-2">
                  <p className="font-semibold text-sm">DELIVERY ADDRESS:</p>
                  <p className="text-sm">{extractedReceipt.deliveryAddress}</p>
                </div>
              )}

              {extractedReceipt.deliveryTime && (
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Delivery Time:</span>
                  <span>{extractedReceipt.deliveryTime}</span>
                </div>
              )}

              <div className="text-center border-t-2 border-gray-300 pt-4">
                <p className="text-xs text-gray-500">Thank you for your order!</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 print:hidden">
              <Button onClick={handlePrint} className="flex-1 gap-2">
                <Printer className="w-4 h-4" />
                Print Receipt
              </Button>
              <Button onClick={handleScanAgain} variant="outline" className="flex-1">
                Scan Again
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
