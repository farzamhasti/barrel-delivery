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
  status: "Pending" | "Ready" | "On the Way" | "Delivered";
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
  const [originalItems, setOriginalItems] = useState<OrderItemFormData[]>([]);
  const [editingItemQuantity, setEditingItemQuantity] = useState<number>(1);
  const [editingItemPrice, setEditingItemPrice] = useState<number>(0);

  const [itemFormData, setItemFormData] = useState<OrderItemFormData>({
    menuItemId: 0,
    quantity: 1,
    priceAtOrder: 0,
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

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
  const { data: menuCategories = [] } = trpc.menu.categories.list.useQuery();
  const { data: selectedOrderDetails } = trpc.orders.getById.useQuery(
    { orderId: selectedOrderId || 0 },
    { enabled: selectedOrderId !== null }
  );

  const selectedOrder = useMemo(() => {
    if (editingOrderId !== null) {
      return orders.find((order: any) => order.id === editingOrderId);
    }
    return selectedOrderDetails;
  }, [editingOrderId, selectedOrderDetails, orders]);

  // Mutations
  const addOrderItemMutation = trpc.orders.createItem.useMutation({
    onSuccess: (newItem: any) => {
      // Add the new item to editingItems state for immediate UI update
      // Use itemFormData which has the correct price since we just submitted it
      setEditingItems([...editingItems, {
        menuItemId: itemFormData.menuItemId,
        quantity: itemFormData.quantity,
        priceAtOrder: itemFormData.priceAtOrder,
      }]);
      toast.success("Item added to order");
    },
    onError: (error) => {
      toast.error(`Failed to add item: ${error.message}`);
    },
  });

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

  const deleteOrderItemMutation = trpc.orders.deleteItem.useMutation({
    onSuccess: () => {
      invalidateOrderCache(utils);
      toast.success("Item removed from order");
    },
    onError: (error) => {
      toast.error(`Failed to remove item: ${error.message}`);
    },
  });

  // Price calculations
  const priceCalculations = useMemo(() => {
    const subtotal = editingItems.reduce((sum, item) => {
      return sum + (item.priceAtOrder * item.quantity);
    }, 0);
    const taxPercentage = formData.taxPercentage || 13;
    const tax = subtotal * (taxPercentage / 100);
    const total = subtotal + tax;
    return { subtotal, tax, total, taxPercentage };
  }, [editingItems, formData.taxPercentage]);

  // Handlers
  const handleAddItemToOrder = async () => {
    if (itemFormData.menuItemId === 0) {
      toast.error("Please select an item");
      return;
    }

    if (!editingOrderId) {
      toast.error("No order selected");
      return;
    }

    try {
      await addOrderItemMutation.mutateAsync({
        orderId: editingOrderId,
        menuItemId: itemFormData.menuItemId,
        quantity: itemFormData.quantity,
        priceAtOrder: itemFormData.priceAtOrder,
      });

      // Reset form
      setItemFormData({
        menuItemId: 0,
        quantity: 1,
        priceAtOrder: 0,
      });
      setSelectedCategoryId(null);
      setShowAddItemDialog(false);
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const handleSaveOrder = async () => {
    if (!editingOrderId) return;

    try {
      // Delete items that were removed from editingItems
      for (const originalItem of originalItems) {
        const itemExists = editingItems.some(
          (item) => item.menuItemId === originalItem.menuItemId && item.priceAtOrder === originalItem.priceAtOrder
        );
        if (!itemExists) {
          // Find the actual database item ID by matching menuItemId and price
          // We need to delete this from the database
          try {
            // Get all order items to find the ID
            const orderDetails = await utils.orders.getById.fetch({ orderId: editingOrderId });
            const itemToDelete = orderDetails?.items?.find(
              (item: any) => item.menuItemId === originalItem.menuItemId && item.priceAtOrder === originalItem.priceAtOrder
            );
            if (itemToDelete?.id) {
              await deleteOrderItemMutation.mutateAsync({ itemId: itemToDelete.id });
            }
          } catch (error) {
            console.error("Error deleting item:", error);
          }
        }
      }

      // Get the current order to access customerId
      const currentOrder = allOrders?.find((o: any) => o.id === editingOrderId);
      
      await updateOrderMutation.mutateAsync({
        orderId: editingOrderId,
        customerId: currentOrder?.customerId,
        status: formData.status,
        notes: formData.notes,
        totalPrice: priceCalculations.total,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        area: formData.area,
        deliveryTime: formData.hasDeliveryTime && formData.deliveryTime ? formData.deliveryTime : null,
        hasDeliveryTime: formData.hasDeliveryTime,
      })
    } catch (error) {
      console.error("Error saving order:", error);
    }
  };

  const handleEditOrder = async (order: any) => {
    setEditingOrderId(order.id);
    setFormData({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      status: order.status,
      notes: order.notes || "",
      area: order.area,
      taxPercentage: order.taxPercentage || 13,
      hasDeliveryTime: !!order.deliveryTime,
      deliveryTime: order.deliveryTime ? new Date(order.deliveryTime).toISOString().slice(0, 16) : "",
    });
    
    // Fetch order details with items
    try {
      const orderDetails = await utils.orders.getById.fetch({ orderId: order.id });
      if (orderDetails?.items) {
        const items = orderDetails.items.map((item: any) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          priceAtOrder: Number(item.priceAtOrder),
        }));
        setEditingItems(items);
        setOriginalItems(items); // Store original items to track deletions
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      setEditingItems([]);
      setOriginalItems([]);
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

  const handleDeleteOrderItem = async (orderId: number, itemId: number) => {
    try {
      await deleteOrderItemMutation.mutateAsync({ itemId });
      setEditingItems(editingItems.filter((_, idx) => idx !== editingItems.findIndex((item) => item.menuItemId === itemId)));
      invalidateOrderCache(utils);
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingOrderId(null);
    setFormData({
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
    setEditingItems([]);
  };

  if (isLoadingOrders) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-gray-600">Manage and view all orders</p>
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-4">
        <label className="font-semibold">Filter by Date:</label>
        <input
          id="orderDate"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border rounded-md"
        />
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">No orders found for the selected date.</p>
            </CardContent>
          </Card>
        ) : (
          orders.map((order: any) => (
            <Card key={order.id} className="border-2 border-red-300">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
              >
                <div className="flex justify-between items-center">
                  <CardTitle>
                    Order #{order.id} • Total: ${order.totalPrice?.toFixed(2) || '0.00'}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      order.status === 'Pending' ? 'bg-yellow-200 text-yellow-800' :
                      order.status === 'Confirmed' ? 'bg-blue-200 text-blue-800' :
                      order.status === 'Completed' ? 'bg-green-200 text-green-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                    {expandedOrderId === order.id ? <ChevronUp /> : <ChevronDown />}
                  </div>
                </div>
              </CardHeader>

              {expandedOrderId === order.id && (
                <CardContent className="space-y-6">
                  {editingOrderId === order.id ? (
                    // Edit Mode
                    <div className="space-y-6">
                      {/* Customer Information */}
                      <div>
                        <h3 className="font-semibold mb-3">Customer Information</h3>
                        <div className="grid grid-cols-2 gap-4">
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
                          <div className="col-span-2">
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
                        </div>
                        <div className="mt-4">
                          <Label>Notes</Label>
                          <Input
                            placeholder="Add order notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Order Settings */}
                      <div>
                        <h3 className="font-semibold mb-3">Order Settings</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Tax Percentage (%)</Label>
                            <Input
                              type="number"
                              value={formData.taxPercentage}
                              onChange={(e) => setFormData({ ...formData, taxPercentage: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <Checkbox
                              id="hasDeliveryTime"
                              checked={formData.hasDeliveryTime}
                              onCheckedChange={(checked) => setFormData({ ...formData, hasDeliveryTime: checked as boolean })}
                            />
                            <Label htmlFor="hasDeliveryTime" className="cursor-pointer">Enable Delivery Time</Label>
                          </div>
                        </div>
                        {formData.hasDeliveryTime && (
                          <div className="mt-4">
                            <Label>Delivery Time</Label>
                            <Input
                              type="datetime-local"
                              value={formData.deliveryTime}
                              onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                            />
                          </div>
                        )}
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
                            <DialogContent className="overflow-visible max-w-md">
                              <DialogHeader>
                                <DialogTitle>Add Item to Order</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 overflow-visible">
                                {/* Step 1: Category Selection */}
                                <div>
                                  <Label className="font-semibold">Step 1: Select Category</Label>
                                  <div className="border rounded-md overflow-y-auto max-h-48">
                                    {menuCategories.map((category: any) => {
                                      const categoryItems = menuItems.filter((item: any) => item.categoryId === category.id);
                                      if (categoryItems.length === 0) return null;
                                      
                                      return (
                                        <button
                                          key={category.id}
                                          onClick={() => {
                                            setSelectedCategoryId(category.id);
                                            // Reset item selection when category changes
                                            setItemFormData({
                                              menuItemId: 0,
                                              quantity: 1,
                                              priceAtOrder: 0,
                                            });
                                          }}
                                          className={`w-full text-left px-4 py-3 border-b last:border-b-0 font-semibold transition-colors ${
                                            selectedCategoryId === category.id 
                                              ? 'bg-blue-100 text-blue-900 border-l-4 border-l-blue-500' 
                                              : 'hover:bg-gray-50'
                                          }`}
                                        >
                                          <div className="flex justify-between items-center">
                                            <span>{category.name}</span>
                                            <span className="text-xs bg-gray-200 px-2 py-1 rounded">{categoryItems.length}</span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Step 2: Item Selection (filtered by category) */}
                                {selectedCategoryId !== null && (
                                  <div>
                                    <Label className="font-semibold">Step 2: Select Item</Label>
                                    <div className="border rounded-md max-h-48 overflow-y-auto">
                                      {menuItems
                                        .filter((item: any) => item.categoryId === selectedCategoryId)
                                        .map((item: any) => (
                                          <button
                                            key={item.id}
                                            onClick={() => {
                                              setItemFormData({
                                                menuItemId: item.id,
                                                quantity: 1,
                                                priceAtOrder: typeof item.price === 'number' ? item.price : parseFloat(String(item.price)),
                                              });
                                            }}
                                            className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-blue-50 transition-colors ${
                                              itemFormData.menuItemId === item.id ? 'bg-blue-100' : ''
                                            }`}
                                          >
                                            <div className="flex justify-between items-center">
                                              <span className="font-medium">{item.name}</span>
                                              <span className="text-sm text-gray-600">${parseFloat(item.price).toFixed(2)}</span>
                                            </div>
                                          </button>
                                        ))}
                                    </div>
                                    {itemFormData.menuItemId > 0 && (
                                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                                        <Check size={16} className="inline mr-1" />
                                        Selected: {menuItems.find((m: any) => m.id === itemFormData.menuItemId)?.name}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {selectedCategoryId === null && (
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                                    👆 Please select a category first to view items
                                  </div>
                                )}

                                {/* Quantity and Price */}
                                {itemFormData.menuItemId > 0 && (
                                  <>
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
                                  </>
                                )}

                                <Button 
                                  onClick={handleAddItemToOrder} 
                                  className="w-full"
                                  disabled={itemFormData.menuItemId === 0}
                                >
                                  Add Item
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>

                        <div className="space-y-2">
                          {editingItems.map((item, index) => {
                            const menuItem = menuItems.find((m: any) => m.id === item.menuItemId);
                            return (
                              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <div>
                                  <p className="font-semibold">{menuItem?.name}</p>
                                  <p className="text-sm text-gray-600">{item.quantity} × ${item.priceAtOrder.toFixed(2)} = ${(item.quantity * item.priceAtOrder).toFixed(2)}</p>
                                </div>
                                <button
                                  onClick={() => {
                                    setEditingItems(editingItems.filter((_, i) => i !== index));
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Pricing Summary */}
                        <div className="mt-4 p-4 bg-gray-50 rounded space-y-2">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>${priceCalculations.subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tax ({priceCalculations.taxPercentage}%):</span>
                            <span>${priceCalculations.tax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg border-t pt-2">
                            <span>Total:</span>
                            <span>${priceCalculations.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button onClick={handleSaveOrder} className="flex-1 bg-green-600 hover:bg-green-700">
                          <Save size={18} className="mr-2" /> Save Changes
                        </Button>
                        <Button onClick={handleCancelEdit} variant="outline" className="flex-1">
                          <X size={18} className="mr-2" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div>
                        <h3 className="font-semibold mb-2">Customer Information</h3>
                        <p><strong>Name:</strong> {order.customerName}</p>
                        <p><strong>Phone:</strong> {order.customerPhone}</p>
                        <p><strong>Address:</strong> {order.customerAddress}</p>
                        <p><strong>Area:</strong> {order.area}</p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Order Items</h3>
                        {order.items && order.items.length > 0 ? (
                          <ul className="space-y-1">
                            {order.items.map((item: any, idx: number) => (
                              <li key={idx} className="text-sm">
                                {item.name} × {item.quantity} = ${(item.quantity * item.priceAtOrder).toFixed(2)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500">No items in this order</p>
                        )}
                      </div>

                      <div>
                        <p><strong>Subtotal:</strong> ${order.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.priceAtOrder), 0).toFixed(2) || '0.00'}</p>
                        <p><strong>Tax ({order.taxPercentage}%):</strong> ${((order.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.priceAtOrder), 0) || 0) * (order.taxPercentage / 100)).toFixed(2)}</p>
                        <p className="font-bold"><strong>Total:</strong> ${order.totalPrice?.toFixed(2) || '0.00'}</p>
                      </div>

                      {order.deliveryTime && (
                        <div>
                          <p><strong>Delivery Time:</strong> {format(new Date(order.deliveryTime), 'MMM dd, yyyy h:mm a')}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button onClick={() => handleEditOrder(order)} className="flex-1 bg-blue-600 hover:bg-blue-700">
                          <Edit2 size={18} className="mr-2" /> Edit
                        </Button>
                        <Button onClick={() => handleDeleteOrder(order.id)} variant="destructive" className="flex-1">
                          <Trash2 size={18} className="mr-2" /> Delete
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
