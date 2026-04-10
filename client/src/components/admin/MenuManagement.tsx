"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function MenuManagement() {
  const { data: categories = [], refetch: refetchCategories } = trpc.menu.categories.list.useQuery();
  const { data: items = [], refetch: refetchItems } = trpc.menu.items.list.useQuery();
  
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Category form
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  
  // Item form
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
  });

  // Mutations
  const createCategory = trpc.menu.categories.create.useMutation({
    onSuccess: () => {
      toast.success("Category created!");
      setCategoryForm({ name: "", description: "" });
      setShowCategoryDialog(false);
      refetchCategories();
    },
    onError: (error) => toast.error("Failed to create category"),
  });

  const updateCategory = trpc.menu.categories.update.useMutation({
    onSuccess: () => {
      toast.success("Category updated!");
      setCategoryForm({ name: "", description: "" });
      setEditingCategory(null);
      setShowCategoryDialog(false);
      refetchCategories();
    },
    onError: () => toast.error("Failed to update category"),
  });

  const deleteCategory = trpc.menu.categories.delete.useMutation({
    onSuccess: () => {
      toast.success("Category deleted!");
      refetchCategories();
    },
    onError: () => toast.error("Failed to delete category"),
  });

  const createItem = trpc.menu.items.create.useMutation({
    onSuccess: () => {
      toast.success("Menu item created!");
      setItemForm({ name: "", description: "", price: "", categoryId: "" });
      setShowItemDialog(false);
      refetchItems();
    },
    onError: () => toast.error("Failed to create menu item"),
  });

  const updateItem = trpc.menu.items.update.useMutation({
    onSuccess: () => {
      toast.success("Menu item updated!");
      setItemForm({ name: "", description: "", price: "", categoryId: "" });
      setEditingItem(null);
      setShowItemDialog(false);
      refetchItems();
    },
    onError: () => toast.error("Failed to update menu item"),
  });

  const deleteItem = trpc.menu.items.delete.useMutation({
    onSuccess: () => {
      toast.success("Menu item deleted!");
      refetchItems();
    },
    onError: () => toast.error("Failed to delete menu item"),
  });

  // Handlers
  const handleSaveCategory = () => {
    if (!categoryForm.name.trim()) {
      toast.error("Please enter category name");
      return;
    }

    if (editingCategory) {
      updateCategory.mutate({
        id: editingCategory.id,
        name: categoryForm.name,
        description: categoryForm.description,
      });
    } else {
      createCategory.mutate({
        name: categoryForm.name,
        description: categoryForm.description,
      });
    }
  };

  const handleEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description || "" });
    setShowCategoryDialog(true);
  };

  const handleSaveItem = () => {
    if (!itemForm.name.trim() || !itemForm.price || !itemForm.categoryId) {
      toast.error("Please fill all required fields");
      return;
    }

    const itemData = {
      name: itemForm.name,
      description: itemForm.description,
      price: parseFloat(itemForm.price),
      categoryId: parseInt(itemForm.categoryId),
    };

    if (editingItem) {
      updateItem.mutate({
        id: editingItem.id,
        ...itemData,
      });
    } else {
      createItem.mutate(itemData);
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      categoryId: item.categoryId.toString(),
    });
    setShowItemDialog(true);
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: "", description: "" });
    setEditingCategory(null);
  };

  const resetItemForm = () => {
    setItemForm({ name: "", description: "", price: "", categoryId: "" });
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Categories Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Menu Categories</h2>
          <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetCategoryForm} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Edit Category" : "Add New Category"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cat-name">Category Name *</Label>
                  <Input
                    id="cat-name"
                    value={categoryForm.name}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, name: e.target.value })
                    }
                    placeholder="e.g., Appetizers"
                  />
                </div>
                <div>
                  <Label htmlFor="cat-desc">Description</Label>
                  <Textarea
                    id="cat-desc"
                    value={categoryForm.description}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, description: e.target.value })
                    }
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCategoryDialog(false);
                      resetCategoryForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveCategory}>
                    {editingCategory ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat: any) => (
            <Card key={cat.id} className="p-4 border hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg">{cat.name}</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditCategory(cat)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteCategory.mutate({ id: cat.id })}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{cat.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Menu Items Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Menu Items</h2>
          <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetItemForm} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="item-category">Category *</Label>
                  <select
                    id="item-category"
                    value={itemForm.categoryId}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, categoryId: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="item-name">Item Name *</Label>
                  <Input
                    id="item-name"
                    value={itemForm.name}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, name: e.target.value })
                    }
                    placeholder="e.g., Grilled Chicken"
                  />
                </div>
                <div>
                  <Label htmlFor="item-desc">Description</Label>
                  <Textarea
                    id="item-desc"
                    value={itemForm.description}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, description: e.target.value })
                    }
                    placeholder="Optional description"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="item-price">Price ($) *</Label>
                  <Input
                    id="item-price"
                    type="number"
                    step="0.01"
                    value={itemForm.price}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, price: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowItemDialog(false);
                      resetItemForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveItem}>
                    {editingItem ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Item Name</th>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-right py-3 px-4">Price</th>
                  <th className="text-center py-3 px-4">Available</th>
                  <th className="text-center py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => {
                  const category = categories.find((c: any) => c.id === item.categoryId);
                  return (
                    <tr key={item.id} className="border-b hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{item.name}</td>
                      <td className="py-3 px-4">{category?.name}</td>
                      <td className="py-3 px-4 text-right font-semibold">${typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price).toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        {item.isAvailable ? (
                          <span className="text-green-600 font-semibold">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditItem(item)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteItem.mutate({ id: item.id })}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
