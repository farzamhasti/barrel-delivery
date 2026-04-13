import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Edit2, Plus, Save, X, ChevronDown, ChevronUp, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface OrderFormData {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  status: string;
  notes: string;
}

interface OrderItemFormData {
  menuItemId: number;
  quantity: number;
  priceAtOrder: number;
}

export function Orders() {
  // Local state
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Form data
  const [formData, setFormData] = useState<OrderFormData>({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    status: "Pending",
    notes: "",
  });

  const [itemFormData, setItemFormData] = useState<OrderItemFormData>({
    menuItemId: 0,
    quantity: 1,
    priceAtOrder: 0,
  });

  // Queries
  const { data: orders = [], refetch: refetchOrders, isLoading: isLoadingOrders } = trpc.orders.getByDateRange.useQuery(
    {
      startDate: selectedDate,
      endDate: selectedDate,
    },
    {
      refetchOnWindowFocus: false,
    }
  );
  const { data: menuItems = [] } = trpc.menu.items.list.useQuery();
  const { data: selectedOrderDetails } = trpc.orders.getById.useQuery(
    { orderId: selectedOrderId || 0 },
    { enabled: selectedOrderId !== null }
  );

  // Get selected order details - use the detailed version from getById which includes items
  const selectedOrder = useMemo(() => {
    if (selectedOrderDetails) {
      return selectedOrderDetails as any;
    }
    return orders.find((o: any) => o.id === selectedOrderId) as any;
  }, [orders, selectedOrderId, selectedOrderDetails]);

  // Mutations
  const updateOrderMutation = trpc.orders.update.useMutation({
    onSuccess: () => {
      toast.success("Order updated successfully");
      refetchOrders();
      setEditingOrderId(null);
    },
    onError: (error) => {
      toast.error(`Failed to update order: ${error.message}`);
    },
  });

  const updateCustomerMutation = trpc.customers.update.useMutation({
    onSuccess: () => {
      toast.success("Customer information updated");
      refetchOrders();
      setEditingOrderId(null);
    },
    onError: (error) => {
      toast.error(`Failed to update customer: ${error.message}`);
    },
  });

  const updateItemMutation = trpc.orders.updateItem.useMutation({
    onSuccess: () => {
      toast.success("Item updated");
      refetchOrders();
      setEditingItemId(null);
    },
    onError: (error) => {
      toast.error(`Failed to update item: ${error.message}`);
    },
  });

  const deleteItemMutation = trpc.orders.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("Item removed");
      refetchOrders();
    },
    onError: (error) => {
      toast.error(`Failed to delete item: ${error.message}`);
    },
  });

  const createItemMutation = trpc.orders.createItem.useMutation({
    onSuccess: () => {
      toast.success("Item added to order");
      refetchOrders();
      setShowAddItemDialog(false);
      setItemFormData({ menuItemId: 0, quantity: 1, priceAtOrder: 0 });
    },
    onError: (error) => {
      toast.error(`Failed to add item: ${error.message}`);
    },
  });

  const deleteOrderMutation = trpc.orders.delete.useMutation({
    onSuccess: () => {
      toast.success("Order deleted");
      refetchOrders();
      setSelectedOrderId(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete order: ${error.message}`);
    },
  });

  // Handlers
  const handleSelectOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
    setExpandedOrderId(orderId);
  };

  // Update form data when selected order details are loaded
  useEffect(() => {
    if (selectedOrderDetails) {
      setFormData({
        customerName: selectedOrderDetails.customerName || "",
        customerPhone: selectedOrderDetails.customerPhone || "",
        customerAddress: selectedOrderDetails.customerAddress || "",
        status: selectedOrderDetails.status || "Pending",
        notes: selectedOrderDetails.notes || "",
      });
    }
  }, [selectedOrderDetails]);

  const handleEditOrder = () => {
    if (selectedOrder) {
      setFormData({
        customerName: selectedOrder.customerName || "",
        customerPhone: selectedOrder.customerPhone || "",
        customerAddress: selectedOrder.customerAddress || "",
        status: selectedOrder.status || "Pending",
        notes: selectedOrder.notes || "",
      });
      setEditingOrderId(selectedOrderId);
    }
  };

  const handleSaveOrder = () => {
    if (!formData.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (selectedOrder) {
      // Update customer info
      updateCustomerMutation.mutate({
        customerId: selectedOrder.customerId,
        name: formData.customerName,
        phone: formData.customerPhone,
        address: formData.customerAddress,
      });

      // Update order status and notes
      updateOrderMutation.mutate({
        orderId: selectedOrderId!,
        status: formData.status as any,
        notes: formData.notes,
      });
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItemId(item.id);
  };

  const handleSaveItem = (itemId: number, quantity: number, priceAtOrder: number) => {
    if (quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    if (priceAtOrder < 0) {
      toast.error("Price cannot be negative");
      return;
    }

    updateItemMutation.mutate({
      itemId,
      quantity,
      priceAtOrder,
    });
  };

  const handleAddItem = () => {
    if (!itemFormData.menuItemId) {
      toast.error("Please select a menu item");
      return;
    }
    if (itemFormData.quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    if (itemFormData.priceAtOrder < 0) {
      toast.error("Price cannot be negative");
      return;
    }

    createItemMutation.mutate({
      orderId: selectedOrderId!,
      menuItemId: itemFormData.menuItemId,
      quantity: itemFormData.quantity,
      priceAtOrder: itemFormData.priceAtOrder,
    });
  };

  const handleDeleteOrder = (orderId: number) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      deleteOrderMutation.mutate({ orderId });
    }
  };

  const handleDeleteItem = (itemId: number) => {
    if (window.confirm("Are you sure you want to remove this item?")) {
      deleteItemMutation.mutate({ itemId });
    }
  };

  const calculateOrderTotal = (orderItems: any[]) => {
    if (!orderItems) return 0;
    return orderItems.reduce((sum, item) => {
      return sum + parseFloat(item.priceAtOrder) * item.quantity;
    }, 0);
  };

  // Refetch orders when date changes
  useEffect(() => {
    refetchOrders();
  }, [selectedDate, refetchOrders]);

  const isLoading = updateOrderMutation.isPending || updateCustomerMutation.isPending || updateItemMutation.isPending || createItemMutation.isPending;

  return (
    <div className="h-full flex flex-col gap-4 p-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders Management</h1>
          <p className="text-muted-foreground mt-1">View, edit, and manage all restaurant orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Orders List */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Orders List</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{(orders as any[]).length} total orders</p>
            </CardHeader>
            <div className="flex-1 overflow-y-auto">
              {isLoadingOrders ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : orders.length === 0 ? (
                <div className="flex items-center justify-center h-full p-4 text-center">
                  <div className="text-muted-foreground">No orders yet</div>
                </div>
              ) : (
                <div className="divide-y">
                  {(orders as any[]).map((order: any) => (
                    <div
                      key={order.id}
                      onClick={() => handleSelectOrder(order.id)}
                      className={`p-4 cursor-pointer transition-all hover:bg-muted/50 ${
                        selectedOrderId === order.id ? "bg-muted border-l-4 border-blue-500" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">Order #{order.id}</div>
                          <div className="text-xs text-muted-foreground mt-1 truncate">{order.customerName}</div>
                          <div className="text-xs text-muted-foreground mt-1">{order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm') : 'N/A'}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              order.status === "Delivered" ? "bg-green-100 text-green-800" :
                              order.status === "On the Way" ? "bg-blue-100 text-blue-800" :
                              order.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">${parseFloat(order.totalPrice).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Order Details */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <div className="flex flex-col gap-4 h-full overflow-y-auto">
              {/* Customer Information Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-lg">Customer Information</CardTitle>
                  {editingOrderId !== selectedOrderId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEditOrder}
                      className="gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveOrder}
                        disabled={isLoading}
                        className="gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingOrderId(null)}
                        disabled={isLoading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium">Customer Name</label>
                    <Input
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      disabled={editingOrderId !== selectedOrderId}
                      className="mt-1"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      disabled={editingOrderId !== selectedOrderId}
                      className="mt-1"
                      type="tel"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="text-sm font-medium">Delivery Address</label>
                    <Input
                      value={formData.customerAddress}
                      onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                      disabled={editingOrderId !== selectedOrderId}
                      className="mt-1"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-sm font-medium">Order Status</label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                      disabled={editingOrderId !== selectedOrderId}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                        <SelectItem value="On the Way">On the Way</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-sm font-medium">Order Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      disabled={editingOrderId !== selectedOrderId}
                      className="w-full mt-1 p-2 border rounded-md text-sm disabled:bg-muted disabled:cursor-not-allowed"
                      rows={3}
                      placeholder="Add any special instructions or notes..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Order Items Card */}
              <Card className="flex-1 flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
                  <CardTitle className="text-lg">Order Items ({selectedOrder.items?.length || 0})</CardTitle>
                  <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Item to Order</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <label className="text-sm font-medium">Menu Item</label>
                          <Select
                            value={itemFormData.menuItemId ? itemFormData.menuItemId.toString() : ""}
                            onValueChange={(value) => {
                              const selectedItem = menuItems.find((m: any) => m.id === parseInt(value));
                              setItemFormData({
                                ...itemFormData,
                                menuItemId: parseInt(value),
                                priceAtOrder: parseFloat(String(selectedItem?.price || 0)),
                              });
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select a menu item" />
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

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Quantity</label>
                            <Input
                              type="number"
                              min="1"
                              value={itemFormData.quantity}
                              onChange={(e) => setItemFormData({ ...itemFormData, quantity: parseInt(e.target.value) || 1 })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Price</label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={itemFormData.priceAtOrder}
                              onChange={(e) => setItemFormData({ ...itemFormData, priceAtOrder: parseFloat(e.target.value) || 0 })}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setShowAddItemDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAddItem}
                            disabled={createItemMutation.isPending}
                          >
                            {createItemMutation.isPending ? "Adding..." : "Add Item"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>

                <div className="flex-1 overflow-y-auto">
                  {!selectedOrder?.items || selectedOrder?.items?.length === 0 ? (
                    <div className="flex items-center justify-center h-full p-4 text-center">
                      <div className="text-muted-foreground">No items in this order</div>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {selectedOrder?.items?.map((item: any) => (
                        <OrderItemRow
                          key={item.id}
                          item={item}
                          isEditing={editingItemId === item.id}
                          onEdit={() => handleEditItem(item)}
                          onSave={handleSaveItem}
                          onDelete={() => handleDeleteItem(item.id)}
                          isLoading={isLoading}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Order Total */}
                <div className="border-t p-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg">Order Total:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ${calculateOrderTotal(selectedOrder?.items || []).toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Delete Order Button */}
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleDeleteOrder(selectedOrderId!)}
                  disabled={isLoading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Order
                </Button>
              </div>
            </div>
          ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg">Select an order to view details</p>
                </div>
              </Card>
            )
          }
        </div>
      </div>
    </div>
  );
}

// Order Item Row Component
function OrderItemRow({
  item,
  isEditing,
  onEdit,
  onSave,
  onDelete,
  isLoading,
}: {
  item: any;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (itemId: number, quantity: number, price: number) => void;
  onDelete: () => void;
  isLoading: boolean;
}) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [price, setPrice] = useState(parseFloat(item.priceAtOrder));

  return (
    <div className="p-4 hover:bg-muted/50 transition-colors">
      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="font-medium text-sm mb-2">{item.menuItemName}</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="mt-1 h-8"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Price</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="mt-1 h-8"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setQuantity(item.quantity);
                setPrice(parseFloat(item.priceAtOrder));
                onEdit();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onSave(item.id, quantity, price);
                setQuantity(item.quantity);
                setPrice(parseFloat(item.priceAtOrder));
              }}
              disabled={isLoading}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="font-medium text-sm">{item.menuItemName}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {item.quantity} × ${parseFloat(item.priceAtOrder).toFixed(2)} = ${(item.quantity * parseFloat(item.priceAtOrder)).toFixed(2)}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              disabled={isLoading}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onDelete}
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
