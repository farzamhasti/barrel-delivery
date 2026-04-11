import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function OrderManagement() {
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editingCustomerName, setEditingCustomerName] = useState<string>("");
  const [editingCustomerPhone, setEditingCustomerPhone] = useState<string>("");
  const [editingCustomerAddress, setEditingCustomerAddress] = useState<string>("");
  const [editingCustomer, setEditingCustomer] = useState(false);

  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = trpc.orders.list.useQuery();
  const { data: order, refetch: refetchOrder } = trpc.orders.getById.useQuery(
    { orderId: editingOrderId || 0 },
    { enabled: editingOrderId !== null }
  );

  const { data: customer } = trpc.customers.getById.useQuery(
    { customerId: order?.customerId || 0 },
    { enabled: order?.customerId !== undefined && editingOrderId !== null }
  );

  const { data: menuItems } = trpc.menu.items.list.useQuery();

  const updateOrderMutation = trpc.orders.update.useMutation({
    onSuccess: () => {
      toast.success("Order updated successfully");
      refetchOrders();
      refetchOrder();
    },
    onError: (error) => {
      toast.error(`Failed to update order: ${error.message}`);
    },
  });

  const updateItemMutation = trpc.orders.updateItem.useMutation({
    onSuccess: () => {
      toast.success("Order item updated");
      if (editingOrderId) refetchOrder();
      setEditingItemId(null);
    },
    onError: (error) => {
      toast.error(`Failed to update item: ${error.message}`);
    },
  });

  const deleteItemMutation = trpc.orders.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("Order item removed");
      if (editingOrderId) refetchOrder();
    },
    onError: (error) => {
      toast.error(`Failed to delete item: ${error.message}`);
    },
  });

  const deleteOrderMutation = trpc.orders.delete.useMutation({
    onSuccess: () => {
      toast.success("Order deleted successfully");
      refetchOrders();
      setEditingOrderId(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete order: ${error.message}`);
    },
  });

  const updateCustomerMutation = trpc.customers.update.useMutation({
    onSuccess: () => {
      toast.success("Customer information updated");
      refetchOrder();
      setEditingCustomer(false);
    },
    onError: (error) => {
      toast.error(`Failed to update customer: ${error.message}`);
    },
  });

  const handleEditOrder = (orderId: number) => {
    setEditingOrderId(orderId);
  };

  const handleSaveOrder = (newStatus?: string) => {
    if (!editingOrderId) return;
    
    const updateData: any = {};
    if (newStatus) updateData.status = newStatus;
    
    updateOrderMutation.mutate({
      orderId: editingOrderId,
      ...updateData,
    });
  };

  const handleEditItem = (itemId: number, quantity: number, price: number) => {
    setEditingItemId(itemId);
    setEditQuantity(quantity);
    setEditPrice(price);
  };

  const handleSaveItem = () => {
    if (!editingItemId) return;
    
    updateItemMutation.mutate({
      itemId: editingItemId,
      quantity: editQuantity,
      priceAtOrder: editPrice,
    });
  };

  const handleDeleteItem = (itemId: number) => {
    if (confirm("Are you sure you want to remove this item from the order?")) {
      deleteItemMutation.mutate({ itemId });
    }
  };

  const handleDeleteOrder = (orderId: number) => {
    if (confirm("Are you sure you want to delete this entire order? This action cannot be undone.")) {
      deleteOrderMutation.mutate({ orderId });
    }
  };

  const handleEditCustomer = () => {
    if (!order || !customer) return;
    // Load current customer info
    setEditingCustomerName(customer.name);
    setEditingCustomerPhone(customer.phone || "");
    setEditingCustomerAddress(customer.address);
    setEditingCustomer(true);
  };

  const handleSaveCustomer = () => {
    if (!order) return;
    
    updateCustomerMutation.mutate({
      customerId: order.customerId,
      name: editingCustomerName,
      phone: editingCustomerPhone,
      address: editingCustomerAddress,
    });
  };

  const getCustomerName = (customerId: number) => {
    // Customer name will be fetched from order details
    return `Customer #${customerId}`;
  };

  if (ordersLoading) {
    return <div className="p-4">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Order Management</h1>
        <p className="text-gray-600 mt-2">View, edit, and delete orders</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell>#{order.id}</TableCell>
                    <TableCell>{getCustomerName(order.customerId)}</TableCell>
                    <TableCell>${parseFloat(order.totalPrice).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-sm ${
                        order.status === "Delivered" ? "bg-green-100 text-green-800" :
                        order.status === "On the Way" ? "bg-blue-100 text-blue-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell>{order.items?.length || 0}</TableCell>
                    <TableCell className="space-x-2">
                      <Dialog open={editingOrderId === order.id} onOpenChange={(open) => {
                        if (!open) setEditingOrderId(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditOrder(order.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Order #{editingOrderId}</DialogTitle>
                          </DialogHeader>
                          {order ? (
                            <div className="space-y-6">
                              {/* Customer Information */}
                              <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
                                <h3 className="font-semibold">Customer Information</h3>
                                {editingCustomer ? (
                                  <div className="space-y-2">
                                    <Input
                                      placeholder="Customer Name"
                                      value={editingCustomerName}
                                      onChange={(e) => setEditingCustomerName(e.target.value)}
                                    />
                                    <Input
                                      placeholder="Phone Number"
                                      value={editingCustomerPhone}
                                      onChange={(e) => setEditingCustomerPhone(e.target.value)}
                                    />
                                    <Input
                                      placeholder="Address"
                                      value={editingCustomerAddress}
                                      onChange={(e) => setEditingCustomerAddress(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={handleSaveCustomer} className="flex-1">
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingCustomer(false)}
                                        className="flex-1"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1 text-sm">
                                    <p><strong>Name:</strong> {customer?.name}</p>
                                    <p><strong>Phone:</strong> {customer?.phone || "N/A"}</p>
                                    <p><strong>Address:</strong> {customer?.address}</p>
                                    <Button size="sm" variant="outline" onClick={handleEditCustomer} className="mt-2">
                                      <Edit className="w-3 h-3 mr-1" /> Edit
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Order Status */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <Select defaultValue={order.status} onValueChange={(value) => {
                                  handleSaveOrder(value);
                                }}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="On the Way">On the Way</SelectItem>
                                    <SelectItem value="Delivered">Delivered</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Order Notes */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Notes</label>
                                <Textarea
                                  defaultValue={order.notes || ""}
                                  placeholder="Order notes..."
                                  onChange={(e) => {
                                    updateOrderMutation.mutate({
                                      orderId: order.id,
                                      notes: e.target.value,
                                    });
                                  }}
                                />
                              </div>

                              {/* Order Items */}
                              <div className="space-y-3">
                                <h3 className="font-semibold">Order Items</h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {order.items?.map((item: any) => (
                                    <div key={item.id} className="flex items-center gap-2 p-2 border rounded">
                                      {editingItemId === item.id ? (
                                        <>
                                          <Input
                                            type="number"
                                            min="1"
                                            value={editQuantity}
                                            onChange={(e) => setEditQuantity(parseInt(e.target.value))}
                                            className="w-16"
                                          />
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={editPrice}
                                            onChange={(e) => setEditPrice(parseFloat(e.target.value))}
                                            className="flex-1"
                                          />
                                          <Button size="sm" onClick={handleSaveItem}>Save</Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setEditingItemId(null)}
                                          >
                                            Cancel
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <span className="flex-1">
                                            {menuItems?.find((m: any) => m.id === item.menuItemId)?.name || `Item #${item.menuItemId}`} - Qty: {item.quantity} x ${parseFloat(item.priceAtOrder).toFixed(2)}
                                          </span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditItem(item.id, item.quantity, parseFloat(item.priceAtOrder))}
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDeleteItem(item.id)}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Delete Order Button */}
                              <div className="p-3 border border-destructive/50 rounded-lg bg-destructive/5">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertCircle className="w-4 h-4 text-destructive" />
                                  <span className="text-sm font-medium text-destructive">Danger Zone</span>
                                </div>
                                <Button
                                  variant="destructive"
                                  className="w-full"
                                  onClick={() => handleDeleteOrder(order.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Order
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 text-center">Loading order details...</div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
