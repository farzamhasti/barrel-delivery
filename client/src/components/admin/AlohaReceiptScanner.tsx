import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Upload, Camera, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ExtractedOrderData {
  checkNumber: string | null;
  table: string | null;
  guests: number | null;
  server: string | null;
  date: string | null;
  time: string | null;
  deliveryAddress: string | null;
  phoneNumber: string | null;
  items: Array<{
    name: string;
    quantity: number;
    notes: string;
  }>;
}

export function AlohaReceiptScanner() {
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedOrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<ExtractedOrderData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const createOrderMutation = trpc.orders.create.useMutation({
    onSuccess: () => {
      toast.success("Order created successfully from receipt!");
      resetScanner();
    },
    onError: (error) => {
      toast.error(`Failed to create order: ${error.message}`);
    },
  });

  const handleImageCapture = async (file: File) => {
    try {
      setLoading(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = (e.target?.result as string)?.split(",")[1];
        if (!base64Data) {
          setError("Failed to read image");
          setLoading(false);
          return;
        }

        try {
          const response = await fetch("/api/extract-receipt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: base64Data }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to extract receipt data");
          }

          const data = await response.json();
          setExtractedData(data);
          setEditedData(data);
          setReceiptImage(e.target?.result as string);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to extract receipt data");
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

  const handleAddItem = () => {
    if (!editedData) return;
    setEditedData({
      ...editedData,
      items: [...editedData.items, { name: "", quantity: 1, notes: "" }],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (!editedData) return;
    setEditedData({
      ...editedData,
      items: editedData.items.filter((_, i) => i !== index),
    });
  };

  const handleUpdateItem = (
    index: number,
    field: "name" | "quantity" | "notes",
    value: string | number
  ) => {
    if (!editedData) return;
    const updatedItems = [...editedData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === "quantity" ? Math.max(1, Number(value)) : value,
    };
    setEditedData({ ...editedData, items: updatedItems });
  };

  const handleSubmitOrder = async () => {
    if (!editedData) return;

    if (!editedData.deliveryAddress || editedData.deliveryAddress.trim() === "") {
      toast.error("Delivery address is required");
      return;
    }

    try {
      setSubmitting(true);

      const subtotal = editedData.items.reduce((sum, item) => sum + item.quantity * 10, 0);
      const taxPercentage = 13;
      const taxAmount = Math.round(subtotal * (taxPercentage / 100) * 100) / 100;
      const totalPrice = Math.round((subtotal + taxAmount) * 100) / 100;

      await createOrderMutation.mutateAsync({
        customerId: 1,
        subtotal,
        taxAmount,
        totalPrice,
        taxPercentage,
        area: editedData.deliveryAddress,
        notes: `Aloha Check: ${editedData.checkNumber || "Unknown"}\nServer: ${editedData.server || "Unknown"}\nTable: ${editedData.table || "Unknown"}\nGuests: ${editedData.guests || 1}\nPhone: ${editedData.phoneNumber || "Unknown"}\n\nItems from receipt:\n${editedData.items.map((i) => `- ${i.name} (x${i.quantity})${i.notes ? ` - ${i.notes}` : ""}`).join("\n")}`,
        items: editedData.items.map((item) => ({
          menuItemId: 1,
          quantity: item.quantity,
          priceAtOrder: 10,
        })),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit order");
    } finally {
      setSubmitting(false);
    }
  };

  const resetScanner = () => {
    setReceiptImage(null);
    setExtractedData(null);
    setEditedData(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  if (loading) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center min-h-96">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <p className="text-lg font-semibold">Reading receipt...</p>
        <p className="text-sm text-gray-500 mt-2">Processing with Claude AI</p>
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
            <Button onClick={resetScanner} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!receiptImage) {
    return (
      <Card className="p-8">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Aloha Receipt Scanner</h2>
            <p className="text-gray-600">
              Upload or take a photo of the Aloha POS receipt to automatically extract order details
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-500 transition cursor-pointer bg-blue-50">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
              />
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-3"
              >
                <Camera className="w-8 h-8 text-blue-600" />
                <span className="font-semibold text-blue-900">Take Photo</span>
                <span className="text-xs text-blue-700">Use device camera</span>
              </button>
            </div>

            <div className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center hover:border-green-500 transition cursor-pointer bg-green-50">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-3"
              >
                <Upload className="w-8 h-8 text-green-600" />
                <span className="font-semibold text-green-900">Upload Photo</span>
                <span className="text-xs text-green-700">From gallery</span>
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Tip:</strong> For best results, take a clear photo of the printed receipt with
              good lighting and focus on the text.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Receipt Preview</h3>
        <img src={receiptImage} alt="Receipt" className="w-full max-h-96 object-contain rounded" />
      </Card>

      {editedData && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Extracted Order Details
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Check Number</label>
                <Input
                  value={editedData.checkNumber ?? ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, checkNumber: e.target.value })
                  }
                  placeholder="Check number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Table</label>
                <Input
                  value={editedData.table ?? ""}
                  onChange={(e) => setEditedData({ ...editedData, table: e.target.value })}
                  placeholder="Table number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Number of Guests</label>
                <Input
                  type="number"
                  value={editedData.guests ?? ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, guests: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="Number of guests"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Server Name</label>
                <Input
                  value={editedData.server ?? ""}
                  onChange={(e) => setEditedData({ ...editedData, server: e.target.value })}
                  placeholder="Server name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Delivery Address <span className="text-red-500">*</span></label>
                <Input
                  value={editedData.deliveryAddress ?? ""}
                  onChange={(e) => setEditedData({ ...editedData, deliveryAddress: e.target.value })}
                  placeholder="Enter delivery address"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  value={editedData.phoneNumber ?? ""}
                  onChange={(e) => setEditedData({ ...editedData, phoneNumber: e.target.value })}
                  placeholder="Enter phone number (optional)"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium">Order Items</label>
                <Button onClick={handleAddItem} variant="outline" size="sm">
                  + Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {editedData.items.map((item, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Input
                        value={item.name ?? ""}
                        onChange={(e) => handleUpdateItem(index, "name", e.target.value)}
                        placeholder="Item name"
                      />
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity ?? ""}
                        onChange={(e) => handleUpdateItem(index, "quantity", e.target.value)}
                        placeholder="Qty"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={item.notes ?? ""}
                        onChange={(e) => handleUpdateItem(index, "notes", e.target.value)}
                        placeholder="Notes (optional)"
                      />
                    </div>
                    <Button
                      onClick={() => handleRemoveItem(index)}
                      variant="destructive"
                      size="sm"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={resetScanner}
                variant="outline"
                className="flex-1"
                disabled={submitting}
              >
                Scan Again
              </Button>
              <Button
                onClick={handleSubmitOrder}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={submitting || editedData.items.length === 0 || !editedData.deliveryAddress || editedData.deliveryAddress.trim() === ""}
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
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
