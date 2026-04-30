import { trpc } from "@/lib/trpc";
import { invalidateOrderCache } from "@/lib/invalidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit2, Save, X, Loader2, Upload, Camera, Clock, CheckCircle2, Truck, Package } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo, useRef } from "react";
import { ImageZoomModal } from "@/components/ImageZoomModal";
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
  area: "Downtown" | "Central Park" | "Both";
  deliveryTime: string;
  hasDeliveryTime?: boolean;
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
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editCameraInputRef = useRef<HTMLInputElement>(null);

  const [statusFilter, setStatusFilter] = useState<"Pending" | "Ready" | "On the Way" | "Delivered">("Pending");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [formData, setFormData] = useState<OrderFormData>({
    orderNumber: "",
    customerPhone: "",
    customerAddress: "",
    status: "Pending",
    area: "Downtown",
    deliveryTime: "",
  });

  const { data: allOrders = [], isLoading: isLoadingOrders } = trpc.orders.getTodayWithItems.useQuery({
    date: selectedDate.toISOString().split('T')[0],
  });
  
  const orders = useMemo(() => {
    return allOrders.filter((order: any) => order.status === statusFilter);
  }, [allOrders, statusFilter]);
  
  const getOrderCountByStatus = (status: string) => {
    return allOrders.filter((order: any) => order.status === status).length;
  };

  const deleteOrderMutation = trpc.orders.delete.useMutation();
  const updateOrderMutation = trpc.orders.update.useMutation();

  const { data: selectedOrderDetails } = trpc.orders.getWithItems.useQuery(
    { orderId: selectedOrderId || 0 },
    { enabled: !!selectedOrderId }
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
        deliveryTime: formData.hasDeliveryTime ? formData.deliveryTime : null,
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
    const areaValue = (order.area || "Downtown") as "Downtown" | "Central Park" | "Both";
    setFormData({
      orderNumber: order.orderNumber || "",
      customerPhone: order.customerPhone || "",
      customerAddress: order.customerAddress || "",
      status: order.status,
      area: areaValue,
      deliveryTime: order.deliveryTime ? new Date(order.deliveryTime).toISOString().slice(0, 16) : "",
      hasDeliveryTime: !!order.deliveryTime,
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
          <div className="flex justify-between items-center mb-4">
            <div>
              <CardTitle>Orders for Today</CardTitle>
              <div className="mt-3 flex items-center gap-2">
                <Label htmlFor="order-date" className="text-sm font-medium">Select Date:</Label>
                <Input
                  id="order-date"
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="w-40"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["Pending", "Ready", "On the Way", "Delivered"] as const).map((status) => {
              const statusConfig = {
                Pending: { icon: Clock, color: "text-gray-600" },
                Ready: { icon: CheckCircle2, color: "text-blue-600" },
                "On the Way": { icon: Truck, color: "text-orange-600" },
                Delivered: { icon: Package, color: "text-green-600" },
              };
              const config = statusConfig[status];
              const IconComponent = config.icon;
              return (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  onClick={() => setStatusFilter(status)}
                  className="px-4 py-2 flex items-center gap-2"
                >
                  <IconComponent className={`w-4 h-4 ${config.color}`} />
                  {status} ({getOrderCountByStatus(status)})
                </Button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingOrders ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-gray-500">No orders for today</p>
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
                      <p className="text-sm font-medium">Status: {order.status}</p>
                      <p className={`text-sm font-medium ${order.driverName ? 'text-green-600' : 'text-gray-600'}`}>Driver: {order.driverName || 'N/A'}</p>
                      {order.deliveryTime && (
                        <p className="text-sm text-gray-600 mt-1">Delivery Time: {new Date(order.deliveryTime).toLocaleString()}</p>
                      )}
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
            <DialogTitle className="text-2xl font-bold">Order #<span className="text-blue-600">{selectedOrderDetails?.orderNumber}</span></DialogTitle>
          </DialogHeader>
          {selectedOrderDetails && (
            <>
              {/* Main Details Card */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white">
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Address Section */}
                    <div className="flex items-start space-x-4 pb-4 border-b border-slate-200">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</p>
                        <p className="text-base font-medium text-gray-900 mt-1">{selectedOrderDetails.customerAddress}</p>
                      </div>
                    </div>

                    {/* Contact Number Section */}
                    <div className="flex items-start space-x-4 pb-4 border-b border-slate-200">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Number</p>
                        <p className="text-base font-medium text-gray-900 mt-1">{selectedOrderDetails.customerPhone || "N/A"}</p>
                      </div>
                    </div>

                    {/* Area Section */}
                    <div className="flex items-start space-x-4 pb-4 border-b border-slate-200">
                      <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6.553 3.276A1 1 0 0021 20.382V9.618a1 1 0 00-1.447-.894L15 11m0 13V11m0 0L9 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Area</p>
                        <div className="mt-1">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                            {selectedOrderDetails.area}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Time Section */}
                    {selectedOrderDetails.deliveryTime && (
                      <div className="flex items-start space-x-4 pb-4 border-b border-slate-200">
                        <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Time</p>
                          <p className="text-base font-medium text-gray-900 mt-1">
                            {new Date(selectedOrderDetails.deliveryTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Status Section */}
                    <div className="flex items-start space-x-4 pb-4 border-b border-slate-200">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Status</p>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            selectedOrderDetails.status === "Pending" ? "bg-gray-100 text-gray-800" :
                            selectedOrderDetails.status === "Ready" ? "bg-blue-100 text-blue-800" :
                            selectedOrderDetails.status === "On the Way" ? "bg-orange-100 text-orange-800" :
                            "bg-green-100 text-green-800"
                          }`}>
                            {selectedOrderDetails.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Driver Section */}
                    {(selectedOrderDetails as any).driverName ? (
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned Driver</p>
                          <p className="text-base font-medium text-green-600 mt-1">{(selectedOrderDetails as any).driverName}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned Driver</p>
                          <p className="text-base font-medium text-gray-500 mt-1">Not assigned</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Scanned Receipt Image Section */}
              {selectedOrderDetails.receiptImage && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg">Scanned Receipt</h3>
                  <div className="bg-white rounded-lg p-4 border border-gray-300">
                    <img
                      src={selectedOrderDetails.receiptImage}
                      alt="Scanned Receipt"
                      className="w-full rounded border max-h-96 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setZoomImageUrl(selectedOrderDetails.receiptImage)}
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">Click to zoom</p>
                  </div>
                </div>
              )}

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

      {/* Image Zoom Modal */}
      {zoomImageUrl && (
        <ImageZoomModal
          isOpen={true}
          imageUrl={zoomImageUrl}
          imageAlt="Scanned Receipt"
          onClose={() => setZoomImageUrl(null)}
        />
      )}

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
              <Select value={formData.area} onValueChange={(value) => setFormData({ ...formData, area: value as "Downtown" | "Central Park" | "Both" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Downtown">Downtown</SelectItem>
                  <SelectItem value="Central Park">Central Park</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
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
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hasDeliveryTime"
                  checked={formData.hasDeliveryTime || false}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      hasDeliveryTime: e.target.checked,
                      deliveryTime: e.target.checked ? formData.deliveryTime : "",
                    });
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
                <Label htmlFor="hasDeliveryTime" className="cursor-pointer">Delivery Time (Optional)</Label>
              </div>
              {formData.hasDeliveryTime && (
                <Input
                  type="datetime-local"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                  className="mt-2"
                />
              )}
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
