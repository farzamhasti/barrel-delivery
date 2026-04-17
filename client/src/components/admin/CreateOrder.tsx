import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Trash2, GripVertical, Edit2, Check, X } from "lucide-react";
import { useLocation } from "wouter";

export default function CreateOrder() {
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    notes: "",
    area: "",
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

  const handleAddItem = (itemId: number) => {
    const item = menuItems.find((m: any) => m.id === itemId);
    if (item) {
      const existingItem = formData.items.find((i) => i.menuItemId === itemId);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        formData.items.push({
          menuItemId: itemId,
          quantity: 1,
          priceAtOrder: parseFloat(item.price as any),
        });
      }
      setFormData({ ...formData });
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

      // Drizzle ORM returns an array [ResultSetHeader, undefined]
      const customerId = Array.isArray(customerResult) ? (customerResult as any)[0]?.insertId : (customerResult as any).insertId;
      const totalPrice = formData.items.reduce((sum, item) => sum + item.priceAtOrder * item.quantity, 0);

      // Create order
      await createOrderMutation.mutateAsync({
        customerId,
        totalPrice,
        notes: formData.notes || undefined,
        area: formData.area || undefined,
        items: formData.items,
      });

      toast.success("Order created successfully!");
      setFormData({
        customerName: "",
        customerPhone: "",
        customerAddress: "",
        notes: "",
        area: "",
        items: [],
      });
      // Redirect to Orders page
      navigate("/admin/orders");
    } catch (error) {
      toast.error("Failed to create order");
    }
  };

  const totalPrice = formData.items.reduce((sum, item) => sum + (Number(item.priceAtOrder) || 0) * item.quantity, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Create New Order</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Customer Information</h3>
                <div>
                  <Label htmlFor="name">Customer Name</Label>
                  <Input
                    id="name"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Delivery Address</Label>
                  <Input
                    id="address"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                    placeholder="123 Main St, City, State"
                  />
                </div>
                <div>
                  <Label htmlFor="area">Area</Label>
                  <select
                    id="area"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  >
                    <option value="">Select Area</option>
                    <option value="Downtown">Downtown</option>
                    <option value="CP">CP</option>
                    <option value="B">B</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Special instructions, allergies, etc."
                  />
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-semibold text-foreground mb-4">Select Items</h3>
                <div className="space-y-4">
                  {categories.map((cat: any) => (
                    <div key={cat.id}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">{cat.name}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {menuItems
                          .filter((item: any) => item.categoryId === cat.id && item.isAvailable)
                          .map((item: any) => (
                            <Button
                              key={item.id}
                              type="button"
                              variant="outline"
                              className="justify-start text-left"
                              onClick={() => handleAddItem(item.id)}
                            >
                              <span className="flex-1">{item.name}</span>
                              <span className="text-xs">${parseFloat(item.price as any).toFixed(2)}</span>
                            </Button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Create Order
              </Button>
            </form>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="p-6 sticky top-6">
            <h3 className="font-semibold text-foreground mb-4">Order Summary</h3>
            <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
              {formData.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No items added yet</p>
              ) : (
                formData.items.map((item, index) => {
                  const menuItem = menuItems.find((m: any) => m.id === item.menuItemId);
                  const itemTotal = item.priceAtOrder * item.quantity;

                  return (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                      className={`p-3 border rounded-lg transition-all ${
                        draggedIndex === index ? "opacity-50 bg-accent/10" : "hover:bg-muted/50"
                      }`}
                    >
                      {editingIndex === index ? (
                        // Edit Mode
                        <div className="space-y-2">
                          <div className="flex gap-2 items-center">
                            <span className="text-sm font-medium flex-1">{menuItem?.name}</span>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-xs text-muted-foreground">Qty</label>
                              <Input
                                type="number"
                                min="1"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                                className="h-8"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-muted-foreground">Price</label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editPrice}
                                onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                                className="h-8"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleSaveEdit(index)}
                              className="flex-1 h-8"
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingIndex(null)}
                              className="flex-1 h-8"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-sm font-medium truncate">{menuItem?.name}</span>
                              <span className="text-sm font-semibold text-accent whitespace-nowrap">
                                ${((Number(itemTotal) || 0)).toFixed(2)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.quantity} × ${(Number(item.priceAtOrder) || 0).toFixed(2)}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditItem(index)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteItem(index)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between mb-4">
                <span className="text-foreground font-semibold">Total:</span>
                <span className="text-2xl font-bold text-accent">${totalPrice.toFixed(2)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {formData.items.length} item{formData.items.length !== 1 ? "s" : ""}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
