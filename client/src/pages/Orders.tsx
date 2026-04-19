import { trpc } from "@/lib/trpc";
import { invalidateOrderCache, invalidateCustomerCache } from "@/lib/invalidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Edit2, Plus, Save, X, ChevronDown, ChevronUp, Loader2, Calendar, GripVertical, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState, useMemo } from "react";

interface OrderFormData {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  status: string;
  notes: string;
  area: string;
  taxPercentage: number;
  hasDeliveryTime: boolean;
  deliveryTime: string;
}

interface OrderItemFormData {
  menuItemId: number;
  quantity: number;
  priceAtOrder: number;
}

export function Orders() {
  // Get trpc utils for cache invalidation
  const utils = trpc.useUtils();

  // Local state
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Form data
  const [formData, setFormData] = useState<OrderFormData>({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    status: "Pending",
    notes: "",
    area: "",
    taxPercentage: 13,
    hasDeliveryTime: false,
    deliveryTime: "",
  });

  const [editingItems, setEditingItems] = useState<OrderItemFormData[]>([]);
  const [editingItemQuantity, setEditingItemQuantity] = useState<number>(1);
  const [editingItemPrice, setEditingItemPrice] = useState<number>(0);

  const [itemFormData, setItemFormData] = useState<OrderItemFormData>({
    menuItemId: 0,
    quantity: 1,
    priceAtOrder: 0,
  });

  // Queries
  const { data: allOrders = [], refetch: refetchOrders, isLoading: isLoadingOrders } = trpc.orders.list.useQuery();
  
  // Filter orders by selected date on the client side
  const orders = useMemo(() => {
    return allOrders.filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      const orderYear = orderDate.getUTCFullYear();
      const orderMonth = String(orderDate.getUTCMonth() + 1).padStart(2, '0');
      const orderDay = String(orderDate.getUTCDate()).padStart(2, '0');
      const orderDateStr = `${orderYear}-${orderMonth}-${orderDay}`;
      return orderDateStr === selectedDate;
    });
  }, [allOrders, selectedDate]);

  const { data: menuItems = [] } = trpc.menu.items.list.useQuery();
  const { data: selectedOrderDetails } = trpc.orders.getById.useQuery(
    { orderId: selectedOrderId || 0 },
    { enabled: selectedOrderId !== null }
  );

  const selectedOrder = useMemo(() => {
    if (selectedOrderDetails) {
      return selectedOrderDetails as any;
    }
    return orders.find((o: any) => o.id === selectedOrderId) as any;
  }, [orders, selectedOrderId, selectedOrderDetails]);

  // Calculate price updates dynamically
  const priceCalculations = useMemo(() => {
    // Use editingItems, but if currently editing an item, use the temporary editing values
    const itemsForCalculation = editingItems.map((item, index) => {
      if (index === editingItemIndex) {
        return { ...item, quantity: editingItemQuantity, priceAtOrder: editingItemPrice };
      }
      return item;
    });
    const subtotal = itemsForCalculation.reduce((sum, item) => sum + item.priceAtOrder * item.quantity, 0);
    const taxAmount = subtotal * (formData.taxPercentage / 100);
    const totalPrice = subtotal + taxAmount;
    return { subtotal, taxAmount, totalPrice };
  }, [editingItems, formData.taxPercentage, editingItemIndex, editingItemQuantity, editingItemPrice]);

  // Mutations
  const updateOrderMutation = trpc.orders.update.useMutation({
    onSuccess: () => {
      toast.success("Order updated successfully");
      invalidateOrderCache(utils);
      setEditingOrderId(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to update order: ${error.message}`);
    },
  });

  const updateCustomerMutation = trpc.customers.update.useMutation({
    onSuccess: () => {
      toast.success("Customer information updated");
      invalidateCustomerCache(utils);
    },
    onError: (error: any) => {
      toast.error(`Failed to update customer: ${error.message}`);
    },
  });

  const deleteOrderMutation = trpc.orders.delete.useMutation({
    onSuccess: () => {
      toast.success("Order deleted successfully");
      invalidateOrderCache(utils);
      setSelectedOrderId(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to delete order: ${error.message}`);
    },
  });

  const addOrderItemMutation = trpc.orders.createItem.useMutation({
    onSuccess: () => {
      // Add the new item to the editingItems state immediately for UI feedback
      setEditingItems([...editingItems, {
        menuItemId: itemFormData.menuItemId,
        quantity: itemFormData.quantity,
        priceAtOrder: itemFormData.priceAtOrder,
      }]);
      toast.success("Item added to order");
      invalidateOrderCache(utils);
      setShowAddItemDialog(false);
      setItemFormData({ menuItemId: 0, quantity: 1, priceAtOrder: 0 });
    },
    onError: (error: any) => {
      toast.error(`Failed to add item: ${error.message}`);
    },
  });

  const updateOrderItemMutation = trpc.orders.updateItem.useMutation({
    onSuccess: () => {
      toast.success("Item updated");
      invalidateOrderCache(utils);
    },
    onError: (error: any) => {
      toast.error(`Failed to update item: ${error.message}`);
    },
  });

  const deleteOrderItemMutation = trpc.orders.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("Item removed from order");
      invalidateOrderCache(utils);
    },
    onError: (error: any) => {
      toast.error(`Failed to delete item: ${error.message}`);
    },
  });

  // Handlers
  const handleEditOrder = (order: any) => {
    setEditingOrderId(order.id);
    setFormData({
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      customerAddress: order.customerAddress || "",
      status: order.status || "Pending",
      notes: order.notes || "",
      area: order.area || "",
      taxPercentage: order.taxPercentage || 13,
      hasDeliveryTime: order.hasDeliveryTime || false,
      deliveryTime: order.deliveryTime ? new Date(order.deliveryTime).toISOString().slice(0, 16) : "",
    });
    setEditingItems(order.items || []);
  };

  const handleSaveOrder = async () => {
    if (!formData.customerName || !formData.customerPhone || !formData.customerAddress) {
      toast.error("Please fill in all customer information");
      return;
    }

    if (editingItems.length === 0) {
      toast.error("Order must have at least one item");
      return;
    }

    try {
      // Update customer info
      if (selectedOrder?.customerId) {
        await updateCustomerMutation.mutateAsync({
          customerId: selectedOrder.customerId,
          name: formData.customerName,
          phone: formData.customerPhone,
          address: formData.customerAddress,
        });
      }

      // Calculate new totals based on editingItems
      const subtotal = editingItems.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);
      const taxAmount = subtotal * (formData.taxPercentage / 100);
      const totalPrice = subtotal + taxAmount;

      // Update order with new totals and status
      await updateOrderMutation.mutateAsync({
        orderId: selectedOrderId!,
        status: formData.status as any,
        totalPrice,
      });
    } catch (error) {
      console.error("Error saving order:", error);
    }
  };

  const handleAddItemToOrder = async () => {
    if (!itemFormData.menuItemId || itemFormData.quantity < 1) {
      toast.error("Please select an item and quantity");
      return;
    }

    try {
      await addOrderItemMutation.mutateAsync({
        orderId: selectedOrderId!,
        menuItemId: itemFormData.menuItemId,
        quantity: itemFormData.quantity,
        priceAtOrder: itemFormData.priceAtOrder,
      });
    } catch (error) {
      console.error("Error adding item:", error);
    }
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

  const handleEditItem = (index: number) => {
    setEditingItemIndex(index);
    setEditingItemQuantity(editingItems[index].quantity);
    setEditingItemPrice(editingItems[index].priceAtOrder);
  };

  const handleSaveItemEdit = (index: number) => {
    if (editingItemQuantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    if (editingItemPrice < 0) {
      toast.error("Price cannot be negative");
      return;
    }

    const itemId = selectedOrder?.items?.[index]?.id;
    if (!itemId) {
      toast.error("Item ID not found");
      return;
    }

    updateOrderItemMutation.mutate({
      itemId,
      quantity: editingItemQuantity,
      priceAtOrder: editingItemPrice,
    });
    setEditingItemIndex(null);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newItems = [...editingItems];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);
    
    setEditingItems(newItems);
    setDraggedIndex(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-gray-600 mt-2">Manage and view all orders</p>
      </div>

      {/* Date Filter */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Calendar size={20} />
          <Label htmlFor="orderDate">Filter by Date:</Label>
          <Input
            id="orderDate"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
        </div>
      </Card>

      {/* Orders List */}
      {isLoadingOrders ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600">No orders found for the selected date</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <Card key={order.id} className="overflow-hidden">
              <div
                className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                onClick={() => {
                  setSelectedOrderId(order.id);
                  setExpandedOrderId(expandedOrderId === order.id ? null : order.id);
                }}
              >
                <div className="flex-1">
                  <div className="font-semibold">Order #{order.id}</div>
                  <div className="text-sm text-gray-600">
                    {order.customer?.name} • {order.customer?.phone}
                  </div>
                  <div className="text-sm font-medium mt-1">
                    Total: ${parseFloat(String(order.totalPrice || 0)).toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                    order.status === "Confirmed" ? "bg-blue-100 text-blue-800" :
                    order.status === "Delivered" ? "bg-green-100 text-green-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {order.status}
                  </span>
                  {expandedOrderId === order.id ? <ChevronUp /> : <ChevronDown />}
                </div>
              </div>

              {/* Expanded Order Details */}
              {expandedOrderId === order.id && selectedOrderDetails && (
                <CardContent className="p-6 space-y-6">
                  {editingOrderId === order.id ? (
                    // Edit Mode
                    <div className="space-y-6">
                      {/* Customer Information */}
                      <div>
                        <h3 className="font-semibold mb-3">Customer Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={formData.customerName}
                              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Phone</Label>
                            <Input
                              value={formData.customerPhone}
                              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Address</Label>
                            <Input
                              value={formData.customerAddress}
                              onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Area</Label>
                            <Input
                              value={formData.area}
                              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Status</Label>
                            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Confirmed">Confirmed</SelectItem>
                                <SelectItem value="Delivered">Delivered</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="mt-4">
                          <Label>Notes</Label>
                          <Input
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Add order notes"
                          />
                        </div>
                      </div>

                      {/* Tax and Delivery Time */}
                      <div>
                        <h3 className="font-semibold mb-3">Order Settings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Tax Percentage (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={formData.taxPercentage}
                              onChange={(e) => setFormData({ ...formData, taxPercentage: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="flex items-end">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="hasDeliveryTime"
                                checked={formData.hasDeliveryTime}
                                onCheckedChange={(checked) => setFormData({ ...formData, hasDeliveryTime: checked as boolean })}
                              />
                              <Label htmlFor="hasDeliveryTime" className="cursor-pointer">Enable Delivery Time</Label>
                            </div>
                          </div>
                          {formData.hasDeliveryTime && (
                            <div className="md:col-span-2">
                              <Label>Delivery Time</Label>
                              <Input
                                type="datetime-local"
                                value={formData.deliveryTime}
                                onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Order Items */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-semibold">Order Items</h3>
                          <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="gap-1">
                                <Plus size={16} /> Add Item
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="overflow-visible">
                              <DialogHeader>
                                <DialogTitle>Add Item to Order</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 overflow-visible">
                                <div>
                                  <Label>Item</Label>
                                  <Select
                                    value={itemFormData.menuItemId.toString()}
                                    onValueChange={(value) => {
                                      const item = menuItems.find((m: any) => m.id === parseInt(value));
                                      setItemFormData({
                                        menuItemId: parseInt(value),
                                        quantity: 1,
                                        priceAtOrder: item ? (typeof item.price === 'number' ? item.price : parseFloat(String(item.price))) : 0,
                                      });
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {menuItems.map((item: any) => (
                                        <SelectItem key={item.id} value={item.id.toString()}>
                                          {item.name} - ${parseFloat(item.price).toFixed(2)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Quantity</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={itemFormData.quantity}
                                    onChange={(e) => setItemFormData({ ...itemFormData, quantity: parseInt(e.target.value) || 1 })}
                                  />
                                </div>
                                <div>
                                  <Label>Price</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={itemFormData.priceAtOrder}
                                    onChange={(e) => setItemFormData({ ...itemFormData, priceAtOrder: parseFloat(e.target.value) || 0 })}
                                  />
                                </div>
                                <Button onClick={handleAddItemToOrder} className="w-full">
                                  Add Item
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>

                        <div className="space-y-2">
                          {editingItems.map((item, index) => {
                            const menuItem = menuItems.find((m: any) => m.id === item.menuItemId);
                            const itemTotal = item.priceAtOrder * item.quantity;

                            return (
                              <div
                                key={index}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(index)}
                                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 cursor-move"
                              >
                                <GripVertical size={18} className="text-gray-400" />
                                
                                {editingItemIndex === index ? (
                                  <>
                                    <div className="flex-1">
                                      <div className="text-sm font-medium">{menuItem?.name}</div>
                                      <div className="flex gap-2 mt-1">
                                        <Input
                                          type="number"
                                          min="1"
                                          value={editingItemQuantity}
                                          onChange={(e) => setEditingItemQuantity(parseInt(e.target.value) || 1)}
                                          className="w-16 h-8"
                                        />
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={editingItemPrice}
                                          onChange={(e) => setEditingItemPrice(parseFloat(e.target.value) || 0)}
                                          className="w-24 h-8"
                                        />
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => {
                                        const itemId = selectedOrder?.items?.[index]?.id;
                                        if (itemId) deleteOrderItemMutation.mutate({ itemId });
                                      }}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 size={16} />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingItemIndex(null)}
                                    >
                                      <X size={16} />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex-1">
                                      <div className="text-sm font-medium">{menuItem?.name}</div>
                                      <div className="text-xs text-gray-600">
                                        {item.quantity} × ${item.priceAtOrder.toFixed(2)} = ${itemTotal.toFixed(2)}
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditItem(index)}
                                    >
                                      <Edit2 size={16} />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const itemId = selectedOrder?.items?.[index]?.id;
                                        if (itemId) deleteOrderItemMutation.mutate({ itemId });
                                      }}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 size={16} />
                                    </Button>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Price Summary */}
                        <div className="mt-6 pt-4 border-t space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span className="font-medium">${priceCalculations.subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Tax ({formData.taxPercentage}%):</span>
                            <span className="font-medium">${priceCalculations.taxAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Total:</span>
                            <span className="text-blue-600">${priceCalculations.totalPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Save/Cancel Buttons */}
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveOrder}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          disabled={updateOrderMutation.isPending}
                        >
                          {updateOrderMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button
                          onClick={() => setEditingOrderId(null)}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Customer Information</h3>
                        <div className="text-sm space-y-1">
                          <div><span className="text-gray-600">Name:</span> {selectedOrderDetails?.customerName}</div>
                          <div><span className="text-gray-600">Phone:</span> {selectedOrderDetails?.customerPhone}</div>
                          <div><span className="text-gray-600">Address:</span> {selectedOrderDetails?.customerAddress}</div>
                          {selectedOrderDetails?.area && <div><span className="text-gray-600">Area:</span> {selectedOrderDetails?.area}</div>}
                          {selectedOrderDetails?.notes && <div><span className="text-gray-600">Notes:</span> {selectedOrderDetails?.notes}</div>}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Order Items</h3>
                        <div className="space-y-1 text-sm">
                          {selectedOrderDetails?.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between">
                              <span>{item.menuItemName} × {item.quantity}</span>
                              <span>${(parseFloat(String(item.priceAtOrder)) * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>${parseFloat(String(selectedOrderDetails?.subtotal || 0)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax ({selectedOrderDetails?.taxPercentage || 13}%):</span>
                          <span>${parseFloat(String(selectedOrderDetails?.taxAmount || 0)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-base">
                          <span>Total:</span>
                          <span>${parseFloat(String(selectedOrderDetails?.totalPrice || 0)).toFixed(2)}</span>
                        </div>
                      </div>

                      {selectedOrderDetails?.hasDeliveryTime && selectedOrderDetails?.deliveryTime && (
                        <div className="text-sm">
                          <span className="text-gray-600">Delivery Time:</span> {format(new Date(selectedOrderDetails?.deliveryTime), "PPpp")}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={() => handleEditOrder(selectedOrderDetails)}
                          className="flex-1 gap-1"
                        >
                          <Edit2 size={16} /> Edit
                        </Button>
                        <Button
                          onClick={() => handleDeleteOrder(selectedOrderDetails?.id)}
                          variant="destructive"
                          className="flex-1 gap-1"
                          disabled={deleteOrderMutation.isPending}
                        >
                          <Trash2 size={16} /> Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
