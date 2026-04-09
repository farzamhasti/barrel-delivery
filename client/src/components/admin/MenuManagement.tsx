import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function MenuManagement() {
  const { data: categories = [] } = trpc.menu.categories.list.useQuery();
  const { data: items = [] } = trpc.menu.items.list.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Menu Management</h2>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Categories</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat: any) => (
            <Card key={cat.id} className="p-4 border">
              <h4 className="font-semibold">{cat.name}</h4>
              <p className="text-sm text-muted-foreground mt-2">{cat.description}</p>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Menu Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Item Name</th>
                <th className="text-left py-3 px-4">Category</th>
                <th className="text-right py-3 px-4">Price</th>
                <th className="text-center py-3 px-4">Available</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="py-3 px-4">{item.name}</td>
                  <td className="py-3 px-4">{item.category?.name}</td>
                  <td className="py-3 px-4 text-right">${item.price}</td>
                  <td className="py-3 px-4 text-center">{item.isAvailable ? "✓" : "✗"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
