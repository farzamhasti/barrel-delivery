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

  const { data: selectedOrderDetails } = trpc.orders.getById.useQuery(
    { orderId: selectedOrderId || 0 },
    { enabled: selectedOrderId !== null }
  );

  const updateOrderMutation = trpc.orders.update.useMutation({
    onSuccess: () => {
      setEditingOrderId(null);
      invalidateOrderCache(utils);
      toast.success("Order updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update order: ${error.message}`);
    },
  });

  const deleteOrderMutation = trpc.orders.delete.useMutation({
    onSuccess: () => {
      invalidateOrderCache(utils);
      toast.success("Order deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete order: ${error.message}`);
    },
  });

  const handleSaveOrder = async () => {
    if (!editingOrderId) return;

    try {
      await updateOrderMutation.mutateAsync({
        orderId: editingOrderId,
        status: formData.status,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        area: formData.area,
      })
    } catch (error) {
      console.error("Error saving order:", error);
    }
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

  const handleDeleteOrder = async (orderId: number) => {
    if (confirm("Are you sure you want to delete this order?")) {
      try {
        await deleteOrderMutation.mutateAsync({ orderId });
      } catch (error) {
        console.error("Error deleting order:", error);
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
                  <SelectItem value="DN">DN</SelectItem>
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
    </div>
  );
}
