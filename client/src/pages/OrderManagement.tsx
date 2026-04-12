import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit, Save, X, Plus, AlertCircle, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export function OrderManagement() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editingItems, setEditingItems] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [addingItem, setAddingItem] = useState(false);

  // Form states for editing
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editCustomerAddress, setEditCustomerAddress] = useState("");

  // Add item states
  const [newItemMenuId, setNewItemMenuId] = useState<number | null>(null);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);

  // Item edit states
  const [editItemQuantity, setEditItemQuantity] = useState(1);
  const [editItemPrice, setEditItemPrice] = useState(0);

  // Queries
  const { data: orders, refetch: refetchOrders } = trpc.orders.list.useQuery();
  const { data: selectedOrder, isLoading: isLoadingOrder, error: orderError, refetch: refetchSelectedOrder } = trpc.orders.getById.useQuery(
    { orderId: selectedOrderId || 0 },
    { enabled: selectedOrderId !== null }
  );

  // Use customer data from selectedOrder directly
  const { data: menuItems } = trpc.menu.items.list.useQuery();

  // Mutations
  const updateOrderMutation = trpc.orders.update.useMutation({
    onSuccess: () => {
      toast.success("Order updated");
      refetchSelectedOrder();
      refetchOrders();
    },
    onError: (error) => {
      toast.error(`Failed to update order: ${error.message}`);
    },
  });

  const updateCustomerMutation = trpc.customers.update.useMutation({
    onSuccess: () => {
      toast.success("Customer updated");
      refetchSelectedOrder();
      setEditingCustomer(false);
    },
    onError: (error) => {
      toast.error(`Failed to update customer: ${error.message}`);
    },
  });

  const updateItemMutation = trpc.orders.updateItem.useMutation({
    onSuccess: () => {
      toast.success("Item updated");
      refetchSelectedOrder();
      setEditingItemId(null);
    },
    onError: (error) => {
      toast.error(`Failed to update item: ${error.message}`);
    },
  });

  const deleteItemMutation = trpc.orders.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("Item removed");
      refetchSelectedOrder();
    },
    onError: (error) => {
      toast.error(`Failed to delete item: ${error.message}`);
    },
  });

  const createItemMutation = trpc.orders.createItem.useMutation({
    onSuccess: () => {
      toast.success("Item added");
      refetchSelectedOrder();
      setAddingItem(false);
      setNewItemMenuId(null);
      setNewItemQuantity(1);
      setNewItemPrice(0);
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
    setEditingCustomer(false);
    setEditingItems(false);
    setAddingItem(false);
    setEditingItemId(null);
  };

  const handleEditCustomer = () => {
    if (selectedOrder) {
      setEditCustomerName(selectedOrder.customerName || "");
      setEditCustomerPhone(selectedOrder.customerPhone || "");
      setEditCustomerAddress(selectedOrder.customerAddress || "");
      setEditingCustomer(true);
    }
  };

  const handleSaveCustomer = () => {
    if (!editCustomerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (selectedOrder) {
      updateCustomerMutation.mutate({
        customerId: selectedOrder.customerId,
        name: editCustomerName,
        phone: editCustomerPhone,
        address: editCustomerAddress,
      });
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItemId(item.id);
    setEditItemQuantity(item.quantity);
    setEditItemPrice(parseFloat(item.priceAtOrder));
  };

  const handleSaveItem = (itemId: number) => {
    if (editItemQuantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    if (editItemPrice < 0) {
      toast.error("Price cannot be negative");
      return;
    }
    updateItemMutation.mutate({
      itemId,
      quantity: editItemQuantity,
      priceAtOrder: editItemPrice,
    });
  };

  const handleAddItem = () => {
    if (!newItemMenuId || !selectedOrderId) {
      toast.error("Please select a menu item");
      return;
    }
    if (newItemQuantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    if (newItemPrice < 0) {
      toast.error("Price cannot be negative");
      return;
    }
    createItemMutation.mutate({
      orderId: selectedOrderId,
      menuItemId: newItemMenuId,
      quantity: newItemQuantity,
      priceAtOrder: newItemPrice,
    });
  };

  const calculateTotal = () => {
    if (!selectedOrder?.items) return 0;
    return selectedOrder.items.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.priceAtOrder) * item.quantity);
    }, 0);
  };

  const isLoadingMutation = updateItemMutation.isPending || deleteItemMutation.isPending || createItemMutation.isPending || updateCustomerMutation.isPending;

  return (
    <div className="flex h-screen gap-4 p-4 bg-background">
      {/* Orders List */}
      <div className="w-80 flex flex-col border rounded-lg overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <div className="flex-1 overflow-y-auto">
          {orders?.map((order: any) => (
            <div
              key={order.id}
              onClick={() => handleSelectOrder(order.id)}
              className={`p-3 border-b cursor-pointer hover:bg-muted transition-colors ${
                selectedOrderId === order.id ? "bg-muted" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">Order #{order.id}</div>
                  <div className="text-xs text-muted-foreground">
                    ${parseFloat(order.totalPrice).toFixed(2)}
                  </div>
                  <div className={`text-xs font-medium mt-1 ${
                    order.status === "Delivered" ? "text-green-600" :
                    order.status === "On the Way" ? "text-blue-600" :
                    "text-yellow-600"
                  }`}>
                    {order.status}
                  </div>
                </div>
                {selectedOrderId === order.id && <ChevronRight className="w-4 h-4" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Details */}
      <div className="flex-1 flex flex-col">
        {isLoadingOrder && (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading order details...</div>
          </div>
        )}
        {orderError && (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-600">Error loading order: {orderError.message}</div>
          </div>
        )}
        {selectedOrder ? (
          <>
            {/* Header */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Order #{selectedOrder.id}</CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">
                      Created: {new Date(selectedOrder.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this order?")) {
                        deleteOrderMutation.mutate({ orderId: selectedOrder.id });
                      }
                    }}
                    disabled={deleteOrderMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Order
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Customer Info */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Customer Information</CardTitle>
                  {!editingCustomer && (
                    <Button size="sm" variant="outline" onClick={handleEditCustomer} disabled={isLoadingMutation}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingCustomer ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={editCustomerName}
                        onChange={(e) => setEditCustomerName(e.target.value)}
                        className="mt-1"
                        disabled={updateCustomerMutation.isPending}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <Input
                        value={editCustomerPhone}
                        onChange={(e) => setEditCustomerPhone(e.target.value)}
                        className="mt-1"
                        disabled={updateCustomerMutation.isPending}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Address</label>
                      <Input
                        value={editCustomerAddress}
                        onChange={(e) => setEditCustomerAddress(e.target.value)}
                        className="mt-1"
                        disabled={updateCustomerMutation.isPending}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleSaveCustomer}
                        disabled={updateCustomerMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingCustomer(false)}
                        className="flex-1"
                        disabled={updateCustomerMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="font-medium">{selectedOrder?.customerName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <div className="font-medium">{selectedOrder?.customerPhone || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Address</div>
                      <div className="font-medium">{selectedOrder?.customerAddress}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Status and Notes */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Order Status & Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={selectedOrder.status || "Pending"}
                    onValueChange={(value) => {
                      updateOrderMutation.mutate({
                        orderId: selectedOrder.id,
                        status: value as "Pending" | "On the Way" | "Delivered",
                      });
                    }}
                    disabled={updateOrderMutation.isPending}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="On the Way">On the Way</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={selectedOrder.notes || ""}
                    onChange={(e) => {
                      updateOrderMutation.mutate({
                        orderId: selectedOrder.id,
                        notes: e.target.value,
                      });
                    }}
                    className="mt-1"
                    placeholder="Order notes..."
                    disabled={updateOrderMutation.isPending}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Order Items</CardTitle>
                  {!editingItems && (
                    <Button size="sm" variant="outline" onClick={() => setEditingItems(true)} disabled={isLoadingMutation}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden flex flex-col max-h-[500px]">
                <div className="p-4 space-y-2 flex-1 overflow-y-auto min-h-0">
                  {/* Display Mode */}
                  {!editingItems ? (
                    <>
                      {!selectedOrder?.items?.length ? (
                        <div className="text-sm text-muted-foreground py-4">No items in this order</div>
                      ) : (
                        selectedOrder.items.map((item: any) => (
                          <div key={item.id} className="p-3 border rounded-lg bg-muted/30">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {item.menuItemName || `Item #${item.menuItemId}`}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {item.quantity} × ${parseFloat(item.priceAtOrder).toFixed(2)} = $
                                  {(item.quantity * parseFloat(item.priceAtOrder)).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  ) : (
                    <>
                      {/* Edit Mode */}
                      {/* Add Item Form */}
                      {addingItem && (
                        <div className="p-3 border rounded-lg bg-muted/50 space-y-2 mb-3">
                          <Select
                            value={newItemMenuId?.toString() || ""}
                            onValueChange={(value) => {
                              const menuItem = menuItems?.find((m: any) => m.id === parseInt(value));
                              setNewItemMenuId(parseInt(value));
                              setNewItemPrice(parseFloat(menuItem?.price || "0"));
                            }}
                            disabled={createItemMutation.isPending}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select menu item" />
                            </SelectTrigger>
                            <SelectContent>
                              {menuItems?.map((item: any) => (
                                <SelectItem key={item.id} value={item.id.toString()}>
                                  {item.name} - ${parseFloat(item.price).toFixed(2)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              min="1"
                              placeholder="Qty"
                              value={newItemQuantity}
                              onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-20"
                              disabled={createItemMutation.isPending}
                            />
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Price"
                              value={newItemPrice}
                              onChange={(e) => setNewItemPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="flex-1"
                              disabled={createItemMutation.isPending}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1" onClick={handleAddItem} disabled={createItemMutation.isPending}>
                              Add
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                setAddingItem(false);
                                setNewItemMenuId(null);
                                setNewItemQuantity(1);
                                setNewItemPrice(0);
                              }}
                              disabled={createItemMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Items List in Edit Mode */}
                      {selectedOrder.items?.map((item: any) => (
                        <div key={item.id} className="p-3 border rounded-lg">
                          {editingItemId === item.id ? (
                            <div className="space-y-2">
                              <div className="text-sm font-medium">
                                {item.menuItemName || `Item #${item.menuItemId}`}
                              </div>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="Quantity"
                                  value={editItemQuantity}
                                  onChange={(e) => setEditItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-20"
                                  disabled={updateItemMutation.isPending}
                                />
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Price"
                                  value={editItemPrice}
                                  onChange={(e) => setEditItemPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="flex-1"
                                  disabled={updateItemMutation.isPending}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleSaveItem(item.id)}
                                  disabled={updateItemMutation.isPending}
                                >
                                  <Save className="w-4 h-4 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => setEditingItemId(null)}
                                  disabled={updateItemMutation.isPending}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {item.menuItemName || `Item #${item.menuItemId}`}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {item.quantity} × ${parseFloat(item.priceAtOrder).toFixed(2)} = $
                                  {(item.quantity * parseFloat(item.priceAtOrder)).toFixed(2)}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditItem(item)}
                                  disabled={isLoadingMutation}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm("Remove this item?")) {
                                      deleteItemMutation.mutate({ itemId: item.id });
                                    }
                                  }}
                                  disabled={deleteItemMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add Item Button */}
                      {!addingItem && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => setAddingItem(true)}
                          disabled={isLoadingMutation}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Item
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
              <div className="border-t p-4 bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="text-lg font-bold">${calculateTotal().toFixed(2)}</span>
                </div>
                {editingItems && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingItems(false)}
                      disabled={isLoadingMutation}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Done
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setEditingItems(false);
                        setAddingItem(false);
                        setEditingItemId(null);
                      }}
                      disabled={isLoadingMutation}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Select an order to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
