import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit, Plus } from "lucide-react";
import { toast } from "sonner";

export function OrderManagement() {
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editPrice, setEditPrice] = useState<number>(0);

  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = trpc.orders.list.useQuery();
  const { data: order, refetch: refetchOrder } = trpc.orders.getById.useQuery(
    { orderId: editingOrderId || 0 },
    { enabled: editingOrderId !== null }
  );
  const { data: menuItems } = trpc.menu.items.list.useQuery();

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

  if (ordersLoading) {
    return <div className="p-4">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Order Management</h1>
        <p className="text-gray-600 mt-2">View and edit orders</p>
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
                    <TableCell>{order.customerId}</TableCell>
                    <TableCell>${order.totalPrice}</TableCell>
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
                    <TableCell>
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
                                            Item #{item.menuItemId} - Qty: {item.quantity} x ${item.priceAtOrder}
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
                            </div>
                          ) : (
                            <div className="p-4 text-center">Loading order details...</div>
                          )}
                        </DialogContent>
                      </Dialog>
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
