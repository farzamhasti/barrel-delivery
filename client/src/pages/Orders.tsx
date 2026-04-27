import { trpc } from "@/lib/trpc";
import { invalidateOrderCache } from "@/lib/invalidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Edit2, Save, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
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

interface OrderFormData {
  orderNumber: string;
  customerPhone: string;
  customerAddress: string;
  status: "Pending" | "Ready" | "On the Way" | "Delivered";
  area: string;
  deliveryTime: string;
}

export function Orders() {
  const utils = trpc.useUtils();

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [deleteConfirmOrderId, setDeleteConfirmOrderId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    area: "",
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
  const convertReceiptMutation = trpc.orders.convertReceiptImage.useMutation();
  const updateReceiptMutation = trpc.orders.updateReceipt.useMutation();

  const { data: selectedOrderDetails } = trpc.orders.getWithItems.useQuery(
    { orderId: selectedOrderId || 0 },
    { enabled: selectedOrderId !== null }
  );

  const isDeleting = deleteOrderMutation.isPending;

  // Update and delete mutations removed - use updateStatus and assignDriver instead

  const handleSaveOrder = async () => {
    if (!editingOrderId) return;
    // Order editing disabled - use updateStatus mutation instead
    setEditingOrderId(null);
  };

  const handleEditOrder = async (order: any) => {
    setEditingOrderId(order.id);
    setFormData({
      orderNumber: order.orderNumber || "",
      customerPhone: order.customerPhone || "",
      customerAddress: order.customerAddress || "",
      status: order.status,
      area: order.area || "",
      deliveryTime: order.deliveryTime ? new Date(order.deliveryTime).toISOString().slice(0, 16) : "",
    });
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
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">Order #{order.orderNumber}</p>
                      <p className="text-sm text-gray-600">{order.customerAddress}</p>
                      <p className="text-sm text-gray-600">{order.customerPhone}</p>
                      <p className="text-sm text-gray-600">Area: {order.area}</p>
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

      {selectedOrderId !== null && selectedOrderDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Order Details - #{selectedOrderDetails.orderNumber}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            </div>

            {/* Receipt Images Section */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-lg">Receipt Information</h3>
              
              {/* Formatted Receipt Text */}
              {selectedOrderDetails.formattedReceiptImage && (
                <div className="bg-white rounded-lg p-4 border border-gray-300">
                  <Label className="text-gray-600 mb-3 block font-semibold">Converted Receipt</Label>
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-gray-50 p-3 rounded border overflow-auto max-h-96">
                    {selectedOrderDetails.formattedReceiptImage}
                  </pre>
                </div>
              )}
              
              
              {!selectedOrderDetails.receiptImage && !selectedOrderDetails.formattedReceiptImage && (
                <p className="text-gray-500 italic">No receipt information available for this order</p>
              )}
              
              {(selectedOrderDetails.receiptImage || selectedOrderDetails.formattedReceiptImage) && (
                <Button
                  onClick={() => {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'image/*';
                    fileInput.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const base64Image = event.target?.result as string;
                          try {
                            const result = await convertReceiptMutation.mutateAsync({ imageData: base64Image });
                            await updateReceiptMutation.mutateAsync({
                              orderId: selectedOrderId || 0,
                              receiptImage: base64Image,
                              formattedReceiptImage: result.html
                            });
                            toast.success('Receipt replaced successfully!');
                            utils.orders.getWithItems.invalidate();
                            setSelectedOrderId(null);
                          } catch (error: any) {
                            toast.error('Failed to replace receipt: ' + error.message);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    fileInput.click();
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  Replace Photo
                </Button>
              )}
            </div>

            <Button 
              onClick={() => setSelectedOrderId(null)} 
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </CardContent>
        </Card>
      )}

      {editingOrderId !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Select value={formData.area} onValueChange={(value) => setFormData({ ...formData, area: value })}>
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

            <div className="flex items-center gap-2">
              <Checkbox
              />
              <Label>Has Delivery Time</Label>
            </div>

              <div>
                <Label>Delivery Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                />
              </div>


            <div className="flex gap-2">
              <Button onClick={handleSaveOrder} className="flex-1">
                <Save size={16} className="mr-2" /> Save
              </Button>
              <Button onClick={handleCancelEdit} variant="outline" className="flex-1">
                <X size={16} className="mr-2" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
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
