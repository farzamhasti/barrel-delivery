import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function CreateOrder() {
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    items: [] as { menuItemId: number; quantity: number; priceAtOrder: number }[],
  });

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
        items: formData.items,
      });

      toast.success("Order created successfully!");
      setFormData({
        customerName: "",
        customerPhone: "",
        customerAddress: "",
        items: [],
      });
    } catch (error) {
      toast.error("Failed to create order");
    }
  };

  const totalPrice = formData.items.reduce((sum, item) => sum + parseFloat(item.priceAtOrder as any) * item.quantity, 0);

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
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-semibold text-foreground mb-4">Select Items</h3>
                <div className="space-y-4">
                  {categories.map((cat: any) => (
                    <div key={cat.id}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">{cat.name}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {menuItems
                          .filter((item: any) => item.categoryId === cat.id)
                          .map((item: any) => (
                            <Button
                              key={item.id}
                              type="button"
                              variant="outline"
                              className="justify-start text-left"
                              onClick={() => handleAddItem(item.id)}
                            >
                              <span className="flex-1">{item.name}</span>
                              <span className="text-xs">${item.priceAtOrder}</span>
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
            <div className="space-y-3 mb-6">
              {formData.items.map((item) => {
                const menuItem = menuItems.find((m: any) => m.id === item.menuItemId);
                return (
                  <div key={item.menuItemId} className="flex justify-between text-sm">
                    <span className="text-foreground">{menuItem?.name}</span>
                    <span className="text-muted-foreground">x{item.quantity}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between mb-4">
                <span className="text-foreground font-semibold">Total:</span>
                <span className="text-2xl font-bold text-accent">${totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
