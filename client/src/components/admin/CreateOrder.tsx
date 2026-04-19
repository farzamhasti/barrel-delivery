import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Trash2, GripVertical, Edit2, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";

export default function CreateOrder() {
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    notes: "",
    area: "",
    taxPercentage: 13,
    hasDeliveryTime: false,
    deliveryTime: "",
    items: [] as { menuItemId: number; quantity: number; priceAtOrder: number }[],
  });

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const { data: categories = [] } = trpc.menu.categories.list.useQuery();
  const { data: menuItems = [] } = trpc.menu.items.list.useQuery();
  const createOrderMutation = trpc.orders.create.useMutation();
  const createCustomerMutation = trpc.customers.create.useMutation();

  // Calculate subtotal, tax, and total dynamically
  const calculations = useMemo(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.priceAtOrder * item.quantity, 0);
    const taxAmount = subtotal * (formData.taxPercentage / 100);
    const totalPrice = subtotal + taxAmount;
    return { subtotal, taxAmount, totalPrice };
  }, [formData.items, formData.taxPercentage]);

  const handleAddItem = (itemId: number) => {
    const item = menuItems.find((m: any) => m.id === itemId);
    if (item) {
      const existingItem = formData.items.find((i) => i.menuItemId === itemId);
      const price = typeof item.price === 'string' ? parseFloat(item.price) : Number(item.price);
      if (existingItem) {
        // Create a new array with updated quantity
        const newItems = formData.items.map(i => 
          i.menuItemId === itemId ? { ...i, quantity: i.quantity + 1 } : i
        );
        setFormData({ ...formData, items: newItems });
      } else {
        // Create a new array with the new item
        const newItems = [...formData.items, {
          menuItemId: itemId,
          quantity: 1,
          priceAtOrder: price,
        }];
        setFormData({ ...formData, items: newItems });
      }
    }
  };

  const handleEditItem = (index: number) => {
    setEditingIndex(index);
    setEditQuantity(formData.items[index].quantity);
    setEditPrice(formData.items[index].priceAtOrder);
  };

  const handleSaveEdit = (index: number) => {
    if (editQuantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    if (editPrice < 0) {
      toast.error("Price cannot be negative");
      return;
    }
    
    const newItems = [...formData.items];
    newItems[index].quantity = editQuantity;
    newItems[index].priceAtOrder = editPrice;
    setFormData({ ...formData, items: newItems });
    setEditingIndex(null);
  };

  const handleDeleteItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
    toast.success("Item removed from order");
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newItems = [...formData.items];
    const draggedItem = newItems[draggedIndex];
    
    // Remove from old position
    newItems.splice(draggedIndex, 1);
    // Insert at new position
    newItems.splice(targetIndex, 0, draggedItem);
    
    setFormData({ ...formData, items: newItems });
    setDraggedIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.customerPhone || !formData.customerAddress) {
      toast.error("Please fill in all customer information");
      return;
    }

    if (formData.items.length === 0) {
      toast.error("Please add at least one item to the order");
      return;
    }

    try {
      // Create customer
      const customerResult = await createCustomerMutation.mutateAsync({
        name: formData.customerName,
        phone: formData.customerPhone,
        address: formData.customerAddress,
      });

      // Extract customerId from the customer object
      const customerId = (customerResult as any)?.id || (Array.isArray(customerResult) ? (customerResult as any)[0]?.insertId : (customerResult as any).insertId);
      
      if (!customerId) {
        toast.error("Failed to create customer");
        return;
      }

      // Create order with tax and delivery time
      await createOrderMutation.mutateAsync({
        customerId,
        subtotal: calculations.subtotal,
        taxPercentage: formData.taxPercentage,
        taxAmount: calculations.taxAmount,
        totalPrice: calculations.totalPrice,
        notes: formData.notes || undefined,
        area: formData.area || undefined,
        deliveryTime: formData.hasDeliveryTime && formData.deliveryTime ? new Date(formData.deliveryTime) : undefined,
        hasDeliveryTime: formData.hasDeliveryTime,
        items: formData.items,
      });

      toast.success("Order created successfully!");
      setFormData({
        customerName: "",
        customerPhone: "",
        customerAddress: "",
        notes: "",
        area: "",
        taxPercentage: 13,
        hasDeliveryTime: false,
        deliveryTime: "",
        items: [],
      });
      // Redirect to Orders page
      navigate("/admin/orders");
    } catch (error) {
      toast.error("Failed to create order");
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Order</h1>
        <p className="text-gray-600 mt-2">Add items and customer details to create an order</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Enter customer name"
                required
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone Number *</Label>
              <Input
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="Enter phone number"
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="customerAddress">Address *</Label>
              <Input
                id="customerAddress"
                value={formData.customerAddress}
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                placeholder="Enter customer address"
                required
              />
            </div>
            <div>
              <Label htmlFor="area">Area</Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="Enter delivery area"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add order notes"
              />
            </div>
          </div>
        </Card>

        {/* Tax and Delivery Time */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Order Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="taxPercentage">Tax Percentage (%)</Label>
              <Input
                id="taxPercentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.taxPercentage}
                onChange={(e) => setFormData({ ...formData, taxPercentage: parseFloat(e.target.value) || 0 })}
                placeholder="Enter tax percentage"
              />
              <p className="text-sm text-gray-500 mt-1">Default: 13% (Canada HST)</p>
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
                <Label htmlFor="deliveryTime">Delivery Time</Label>
                <Input
                  id="deliveryTime"
                  type="datetime-local"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Menu Items */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Add Items</h2>
          <div className="space-y-4">
            {categories.map((category: any) => (
              <div key={category.id}>
                <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {menuItems
                    .filter((item: any) => item.categoryId === category.id)
                    .map((item: any) => (
                      <Button
                        key={item.id}
                        type="button"
                        variant="outline"
                        onClick={() => handleAddItem(item.id)}
                        className="text-left h-auto py-2 px-3"
                      >
                        <div className="text-sm">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-600">${parseFloat(item.price).toFixed(2)}</div>
                        </div>
                      </Button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Order Items */}
        {formData.items.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Order Items</h2>
            <div className="space-y-2">
              {formData.items.map((item, index) => {
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
                    
                    {editingIndex === index ? (
                      <>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{menuItem?.name}</div>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="number"
                              min="1"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                              className="w-16 h-8"
                            />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editPrice}
                              onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                              className="w-24 h-8"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSaveEdit(index)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check size={16} />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingIndex(null)}
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
                          onClick={() => handleDeleteItem(index)}
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
                <span className="font-medium">${calculations.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax ({formData.taxPercentage}%):</span>
                <span className="font-medium">${calculations.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-blue-600">${calculations.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex gap-2">
          <Button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={createOrderMutation.isPending}
          >
            {createOrderMutation.isPending ? "Creating..." : "Create Order"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/orders")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
