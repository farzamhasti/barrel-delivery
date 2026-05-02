import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Camera, Upload, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface ReceiptScannerProps {
  onReceiptCapture?: (data: {
    checkNumber: string;
    items: Array<{ name: string; quantity: number }>;
    imageUrl?: string;
  }) => void;
  disabled?: boolean;
}

/**
 * Standalone OCR Receipt Scanner Component
 * Completely isolated - no dependencies on other components
 * Handles image capture/upload and displays extracted data
 */
export function ReceiptScannerOCR({
  onReceiptCapture,
  disabled = false,
}: ReceiptScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<{
    checkNumber: string;
    items: Array<{ name: string; quantity: number }>;
  } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = async (file: File) => {
    setError(null);
    setIsProcessing(true);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target?.result as string;
        setPreviewImage(base64Image);

        // For now, show preview and wait for manual entry
        // In production, this would call the LLM analysis endpoint
        setExtractedData({
          checkNumber: "",
          items: [],
        });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process image"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      handleImageCapture(file);
    }
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageCapture(file);
    }
  };

  const handleConfirmData = () => {
    if (extractedData && extractedData.checkNumber) {
      onReceiptCapture?.({
        ...extractedData,
        imageUrl: previewImage || undefined,
      });
      // Reset state
      setExtractedData(null);
      setPreviewImage(null);
    }
  };

  return (
    <Card className="w-full p-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Receipt Scanner (OCR)</h3>
        <p className="text-sm text-muted-foreground">
          Capture or upload a receipt photo to extract order details
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!previewImage ? (
        <div className="space-y-3">
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || isProcessing}
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
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
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview Image */}
          <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={previewImage}
              alt="Receipt preview"
              className="w-full h-auto max-h-64 object-contain"
            />
          </div>

          {/* Extracted Data Display */}
          {extractedData && (
            <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
              <div>
                <label className="text-sm font-medium">Check Number</label>
                <input
                  type="text"
                  value={extractedData.checkNumber}
                  onChange={(e) =>
                    setExtractedData({
                      ...extractedData,
                      checkNumber: e.target.value,
                    })
                  }
                  placeholder="Enter check number"
                  className="w-full px-2 py-1 mt-1 border rounded text-sm"
                />
              </div>

              {extractedData.items.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Items</label>
                  <div className="space-y-2 mt-2">
                    {extractedData.items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 text-sm">
                        <span className="flex-1">{item.name}</span>
                        <span className="font-semibold">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => {
                setPreviewImage(null);
                setExtractedData(null);
              }}
              className="flex-1"
            >
              Retake
            </Button>
            <Button
              size="sm"
              disabled={
                isProcessing ||
                !extractedData?.checkNumber ||
                extractedData.items.length === 0
              }
              onClick={handleConfirmData}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
