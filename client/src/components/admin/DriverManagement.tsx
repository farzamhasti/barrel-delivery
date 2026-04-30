import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Edit, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function DriverManagement() {
  const utils = trpc.useUtils();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const createDriverMutation = trpc.drivers.create.useMutation({
    onSuccess: () => {
      utils.drivers.list.invalidate();
    },
  });
  const updateDriverMutation = trpc.drivers.update.useMutation({
    onSuccess: () => {
      utils.drivers.list.invalidate();
    },
  });
  const deleteDriverMutation = trpc.drivers.delete.useMutation({
    onSuccess: () => {
      utils.drivers.list.invalidate();
    },
  });
  const setStatusMutation = trpc.drivers.setStatus.useMutation({
    onSuccess: () => {
      utils.drivers.list.invalidate();
    },
  });
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    licenseNumber: "",
    vehicleType: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Please enter driver name");
      return;
    }

    try {
      if (editingId) {
        await updateDriverMutation.mutateAsync({
          id: editingId,
          ...formData,
        });
        toast.success("Driver updated successfully!");
        setEditingId(null);
      } else {
        await createDriverMutation.mutateAsync(formData);
        toast.success("Driver added successfully!");
      }
      
      setFormData({
        name: "",
        phone: "",
        licenseNumber: "",
        vehicleType: "",
      });
      setShowForm(false);
    } catch (error) {
      toast.error(editingId ? "Failed to update driver" : "Failed to add driver");
    }
  };

  const handleEdit = (driver: any) => {
    setEditingId(driver.id);
    setFormData({
      name: driver.name,
      phone: driver.phone || "",
      licenseNumber: driver.licenseNumber || "",
      vehicleType: driver.vehicleType || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this driver?")) {
      try {
        await deleteDriverMutation.mutateAsync({ id });
        toast.success("Driver deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete driver");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Driver Management</h2>
        <Button 
          className="gap-2" 
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: "",
              phone: "",
              licenseNumber: "",
              vehicleType: "",
            });
            setShowForm(!showForm);
          }}
        >
          <Plus className="w-4 h-4" />
          Add Driver
        </Button>
      </div>

      {/* Add/Edit Driver Form */}
      {showForm && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">
                {editingId ? "Edit Driver" : "Add New Driver"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <Label htmlFor="driver-name">Driver Name *</Label>
              <Input
                id="driver-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <Label htmlFor="driver-phone">Phone Number</Label>
              <Input
                id="driver-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                type="tel"
              />
            </div>

            <div>
              <Label htmlFor="driver-license">License Number</Label>
              <Input
                id="driver-license"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                placeholder="DL123456"
              />
            </div>

            <div>
              <Label htmlFor="driver-vehicle">Vehicle Type</Label>
              <Input
                id="driver-vehicle"
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                placeholder="e.g., Motorcycle, Car, Truck"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingId ? "Update Driver" : "Add Driver"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    name: "",
                    phone: "",
                    licenseNumber: "",
                    vehicleType: "",
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Drivers Table */}
      <Card className="p-6">
        {drivers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No drivers added yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold">License</th>
                  <th className="text-left py-3 px-4 font-semibold">Vehicle Type</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-center py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver: any) => (
                  <tr key={driver.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium">{driver.name}</td>
                    <td className="py-3 px-4">{driver.phone || "—"}</td>
                    <td className="py-3 px-4">{driver.licenseNumber || "—"}</td>
                    <td className="py-3 px-4">{driver.vehicleType || "—"}</td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant={driver.status === "online" ? "default" : "outline"}
                        onClick={() => setStatusMutation.mutate({ id: driver.id, status: driver.status === "online" ? "offline" : "online" })}
                        disabled={setStatusMutation.isPending}
                        className="text-xs"
                      >
                        {driver.status === "online" ? "Online" : "Offline"}
                      </Button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(driver)}
                          className="gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(driver.id)}
                          className="gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
