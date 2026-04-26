import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Upload, Camera, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ExtractedOrderData {
  checkNumber: string | null;
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

      // Sanitize fields: convert empty strings to undefined and ensure proper data types
      const sanitizedArea = editedData.deliveryAddress && editedData.deliveryAddress.trim() !== "" ? editedData.deliveryAddress.trim() : undefined;
      const notesContent = `Check: ${editedData.checkNumber || "Unknown"}\nPhone: ${editedData.phoneNumber || "Unknown"}`;
      const sanitizedNotes = notesContent && notesContent.trim() !== "" ? notesContent.trim() : undefined;

      await createOrderMutation.mutateAsync({
        customerId: 1,
        subtotal: parseFloat(String(subtotal)) || 0,
        taxAmount: parseFloat(String(taxAmount)) || 0,
        totalPrice: parseFloat(String(totalPrice)) || 0,
        taxPercentage: parseFloat(String(taxPercentage)) || 0,
        area: sanitizedArea,
        notes: sanitizedNotes,
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

  if (!extractedData || !editedData) {
    return (
      <Card className="p-8">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Scan Aloha Receipt</h2>
          <p className="text-sm text-gray-600">Take a photo or upload an image of the Aloha POS receipt</p>

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
      <div className="flex items-center gap-3 mb-6">
        <CheckCircle2 className="w-6 h-6 text-green-500" />
        <h2 className="text-xl font-semibold">Receipt Data Extracted</h2>
      </div>

      {receiptImage && (
        <div className="mb-6">
          <img src={receiptImage} alt="Receipt" className="max-w-xs rounded-lg border" />
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Check Number</label>
            <Input
              value={editedData.checkNumber || ""}
              onChange={(e) =>
                setEditedData({ ...editedData, checkNumber: e.target.value })
              }
              placeholder="Check number"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone Number</label>
            <Input
              value={editedData.phoneNumber || ""}
              onChange={(e) =>
                setEditedData({ ...editedData, phoneNumber: e.target.value })
              }
              placeholder="Phone number"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Delivery Address *</label>
          <Input
            value={editedData.deliveryAddress || ""}
            onChange={(e) =>
              setEditedData({ ...editedData, deliveryAddress: e.target.value })
            }
            placeholder="Delivery address"
            className="border-red-300"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Items</label>
            <Button onClick={handleAddItem} size="sm" variant="outline">
              Add Item
            </Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {editedData.items.map((item, index) => (
              <div key={index} className="flex gap-2 items-start">
                <Input
                  value={item.name}
                  onChange={(e) => handleUpdateItem(index, "name", e.target.value)}
                  placeholder="Item name"
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleUpdateItem(index, "quantity", e.target.value)}
                  placeholder="Qty"
                  className="w-16"
                />
                <Input
                  value={item.notes}
                  onChange={(e) => handleUpdateItem(index, "notes", e.target.value)}
                  placeholder="Notes"
                  className="flex-1"
                />
                <Button
                  onClick={() => handleRemoveItem(index)}
                  size="sm"
                  variant="destructive"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={resetScanner} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSubmitOrder}
          disabled={submitting || !editedData.deliveryAddress}
          className="flex-1"
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
    </Card>
  );
}
