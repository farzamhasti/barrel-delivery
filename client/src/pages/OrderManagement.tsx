import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit, Save, X, Plus, AlertCircle, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export function OrderManagement() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [addingItem, setAddingItem] = useState(false);

  // Form states for editing
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editCustomerAddress, setEditCustomerAddress] = useState("");
  const [editOrderStatus, setEditOrderStatus] = useState("");
  const [editOrderNotes, setEditOrderNotes] = useState("");

  // Add item states
  const [newItemMenuId, setNewItemMenuId] = useState<number | null>(null);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);

  // Item edit states
  const [editItemQuantity, setEditItemQuantity] = useState(1);
  const [editItemPrice, setEditItemPrice] = useState(0);

  // Queries
  const { data: orders, refetch: refetchOrders } = trpc.orders.list.useQuery();
  const { data: selectedOrder, refetch: refetchSelectedOrder } = trpc.orders.getById.useQuery(
    { orderId: selectedOrderId || 0 },
    { enabled: selectedOrderId !== null }
  );
  const { data: customer } = trpc.customers.getById.useQuery(
    { customerId: selectedOrder?.customerId || 0 },
    { enabled: selectedOrder?.customerId !== undefined }
  );
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
    setAddingItem(false);
    setEditingItemId(null);
  };

  const handleEditCustomer = () => {
    if (customer) {
      setEditCustomerName(customer.name);
      setEditCustomerPhone(customer.phone || "");
      setEditCustomerAddress(customer.address);
      setEditingCustomer(true);
    }
  };

  const handleSaveCustomer = () => {
    if (customer) {
      updateCustomerMutation.mutate({
        customerId: customer.id,
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
                    <Button size="sm" variant="outline" onClick={handleEditCustomer}>
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
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <Input
                        value={editCustomerPhone}
                        onChange={(e) => setEditCustomerPhone(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Address</label>
                      <Input
                        value={editCustomerAddress}
                        onChange={(e) => setEditCustomerAddress(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveCustomer} className="flex-1">
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingCustomer(false)}
                        className="flex-1"
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
                      <div className="font-medium">{customer?.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <div className="font-medium">{customer?.phone || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Address</div>
                      <div className="font-medium">{customer?.address}</div>
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
                  />
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="border-b pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Order Items</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddingItem(!addingItem)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0">
                <div className="p-4 space-y-2">
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
                          onChange={(e) => setNewItemQuantity(parseInt(e.target.value))}
                          className="w-20"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={newItemPrice}
                          onChange={(e) => setNewItemPrice(parseFloat(e.target.value))}
                          className="flex-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={handleAddItem}>
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
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Items List */}
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
                              value={editItemQuantity}
                              onChange={(e) => setEditItemQuantity(parseInt(e.target.value))}
                              className="w-20"
                            />
                            <Input
                              type="number"
                              step="0.01"
                              value={editItemPrice}
                              onChange={(e) => setEditItemPrice(parseFloat(e.target.value))}
                              className="flex-1"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleSaveItem(item.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => setEditingItemId(null)}
                            >
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
                            <div className="text-sm text-muted-foreground">
                              {item.quantity} × ${parseFloat(item.priceAtOrder).toFixed(2)} = $
                              {(item.quantity * parseFloat(item.priceAtOrder)).toFixed(2)}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditItem(item)}
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
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
              <div className="border-t p-4 bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="text-lg font-bold">${calculateTotal().toFixed(2)}</span>
                </div>
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
