import { trpc } from "@/lib/trpc";
import { invalidateOrderCache } from "@/lib/invalidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit2, Save, X, Loader2, Upload, Camera } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo, useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface OrderFormData {
  orderNumber: string;
  customerPhone: string;
  customerAddress: string;
  status: "Pending" | "Ready" | "On the Way" | "Delivered";
  area: "DT" | "CP" | "B";
  deliveryTime: string;
  receiptImage?: string;
}

export function Orders() {
  const utils = trpc.useUtils();

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [deleteConfirmOrderId, setDeleteConfirmOrderId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editReceiptPreview, setEditReceiptPreview] = useState<string | null>(null);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editCameraInputRef = useRef<HTMLInputElement>(null);

  const getTodayDateString = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    return `${year}-${month}-${day}`;
  };
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  const [formData, setFormData] = useState<OrderFormData>({
    orderNumber: "",
    customerPhone: "",
    customerAddress: "",
    status: "Pending",
    area: "DT",
    deliveryTime: "",
  });

  const { data: allOrders = [], isLoading: isLoadingOrders } = trpc.orders.list.useQuery();
  
  const orders = useMemo(() => {
    return allOrders.filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Toronto",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const parts = formatter.formatToParts(orderDate);
      const year = parts.find((p) => p.type === "year")?.value;
      const month = parts.find((p) => p.type === "month")?.value;
      const day = parts.find((p) => p.type === "day")?.value;
      const orderDateStr = `${year}-${month}-${day}`;
      return orderDateStr === selectedDate;
    });
  }, [allOrders, selectedDate]);

  const deleteOrderMutation = trpc.orders.delete.useMutation();
  const updateOrderMutation = trpc.orders.update.useMutation();

  const { data: selectedOrderDetails } = trpc.orders.getWithItems.useQuery(
    { orderId: selectedOrderId || 0 },
    { enabled: selectedOrderId !== null }
  );

  const isDeleting = deleteOrderMutation.isPending;
  const isSaving = updateOrderMutation.isPending;

  const handleReceiptCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setEditReceiptPreview(base64);
        setFormData({ ...formData, receiptImage: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveOrder = async () => {
    if (!editingOrderId) return;
    try {
      const updateData: any = {
        orderId: editingOrderId,
        customerAddress: formData.customerAddress,
        customerPhone: formData.customerPhone,
        status: formData.status,
        area: formData.area,
        deliveryTime: formData.deliveryTime,
      };
      
      // Include receipt image if a new one was uploaded
      if (formData.receiptImage) {
        setIsProcessingReceipt(true);
        toast.loading('Processing receipt photo...');
        updateData.receiptImage = formData.receiptImage;
      }
      
      await updateOrderMutation.mutateAsync(updateData);
      toast.success("Order updated successfully");
      await invalidateOrderCache(utils);
      // Refetch the selected order details to show updated data in the modal
      if (selectedOrderId === editingOrderId) {
        await utils.orders.getWithItems.refetch({ orderId: editingOrderId });
      }
      setEditingOrderId(null);
      setEditReceiptPreview(null);
      setIsProcessingReceipt(false);
    } catch (error: any) {
      setIsProcessingReceipt(false);
      toast.error("Failed to update order: " + error.message);
    }
  };

  const handleEditOrder = async (order: any) => {
    setEditingOrderId(order.id);
    const areaValue = (order.area || "DT") as "DT" | "CP" | "B";
    setFormData({
      orderNumber: order.orderNumber || "",
      customerPhone: order.customerPhone || "",
      customerAddress: order.customerAddress || "",
      status: order.status,
      area: areaValue,
      deliveryTime: order.deliveryTime ? new Date(order.deliveryTime).toISOString().slice(0, 16) : "",
      receiptImage: undefined,
    });
    setEditReceiptPreview(null);
  };

  const handleDeleteOrder = (orderId: number) => {
    setDeleteConfirmOrderId(orderId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmOrderId) {
      try {
        await deleteOrderMutation.mutateAsync({ orderId: deleteConfirmOrderId });
        toast.success("Order deleted successfully");
        await invalidateOrderCache(utils);
      } catch (error) {
        console.error("Error deleting order:", error);
        toast.error("Failed to delete order");
      } finally {
        setShowDeleteConfirm(false);
        setDeleteConfirmOrderId(null);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingOrderId(null);
    setEditReceiptPreview(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders for {selectedDate}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingOrders ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-gray-500">No orders for this date</p>
          ) : (
            <div className="space-y-2">
              {orders.map((order: any) => (
                <div
                  key={order.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedOrderId(order.id)}
                >
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">Order #{order.orderNumber}</p>
                      <p className="text-sm text-gray-600">{order.customerAddress}</p>
                      <p className="text-sm text-gray-600">{order.customerPhone}</p>
                      <p className="text-sm text-gray-600">Area: {order.area}</p>
                      {order.deliveryTime && (
                        <p className="text-sm text-gray-600">Delivery: {new Date(order.deliveryTime).toLocaleString()}</p>
                      )}
                      <p className="text-sm font-medium">Status: {order.status}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditOrder(order);
                        }}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOrder(order.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={selectedOrderId !== null} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrderDetails && (
            <>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Address</Label>
                    <p className="font-medium">{selectedOrderDetails.customerAddress}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Phone</Label>
                    <p className="font-medium">{selectedOrderDetails.customerPhone}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Area</Label>
                    <p className="font-medium">{selectedOrderDetails.area}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Status</Label>
                    <p className="font-medium">{selectedOrderDetails.status}</p>
                  </div>
                  {selectedOrderDetails.deliveryTime && (
                    <div>
                      <Label className="text-gray-600">Delivery Time</Label>
                      <p className="font-medium">
                        {new Date(selectedOrderDetails.deliveryTime).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Receipt Information Section */}
                {selectedOrderDetails.formattedReceiptImage && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-lg">Receipt Information</h3>
                    <div className="bg-white rounded-lg p-4 border border-gray-300">
                      <Label className="text-gray-600 mb-3 block font-semibold">Converted Receipt</Label>
                      {selectedOrderDetails.formattedReceiptImage.includes('═') || selectedOrderDetails.formattedReceiptImage.includes('\n') ? (
                        <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-gray-50 p-3 rounded border overflow-auto max-h-96">
                          {selectedOrderDetails.formattedReceiptImage}
                        </pre>
                      ) : (
                        <img src={selectedOrderDetails.formattedReceiptImage} alt="Converted Receipt" className="w-full rounded border max-h-96 object-contain" />
                      )}
                    </div>
                  </div>
                )}

                {!selectedOrderDetails.formattedReceiptImage && (
                  <p className="text-gray-500 italic">No receipt information available for this order</p>
                )}
              </div>

              <DialogFooter>
                <Button 
                  onClick={() => setSelectedOrderId(null)} 
                  variant="outline"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Modal */}
      <Dialog open={editingOrderId !== null} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Order Number</Label>
              <Input
                value={formData.orderNumber}
                disabled
              />
            </div>

            <div>
              <Label>Customer Phone</Label>
              <Input
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              />
            </div>

            <div>
              <Label>Customer Address</Label>
              <Input
                value={formData.customerAddress}
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
              />
            </div>

            <div>
              <Label>Area</Label>
              <Select value={formData.area} onValueChange={(value) => setFormData({ ...formData, area: value as "DT" | "CP" | "B" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DT">DT</SelectItem>
                  <SelectItem value="CP">CP</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Ready">Ready</SelectItem>
                  <SelectItem value="On the Way">On the Way</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Delivery Time (Optional)</Label>
              <Input
                type="datetime-local"
                value={formData.deliveryTime}
                onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
              />
            </div>

            <div>
              <Label>Replace Receipt Photo (Optional)</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => editFileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload size={16} className="mr-2" />
                  Upload New Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => editCameraInputRef.current?.click()}
                  className="flex-1"
                >
                  <Camera size={16} className="mr-2" />
                  Take Photo
                </Button>
                {editReceiptPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditReceiptPreview(null);
                      setFormData({ ...formData, receiptImage: undefined });
                    }}
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
              {editReceiptPreview && (
                <div className="mt-2 text-xs text-gray-600">New receipt photo selected</div>
              )}
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleReceiptCapture}
                className="hidden"
              />
              <input
                ref={editCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleReceiptCapture}
                className="hidden"
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleCancelEdit} variant="outline" disabled={isSaving}>
              <X size={16} className="mr-2" /> Cancel
            </Button>
            <Button onClick={handleSaveOrder} disabled={isSaving || isProcessingReceipt}>
              {isSaving || isProcessingReceipt ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" /> {isProcessingReceipt ? 'Processing...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" /> Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Are you sure you want to delete this order? This action cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
