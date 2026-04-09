import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function DriverManagement() {
  const { data: drivers = [] } = trpc.drivers.list.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Driver Management</h2>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Driver
        </Button>
      </div>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Phone</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Last Location</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver: any) => (
                <tr key={driver.id} className="border-b hover:bg-muted/30">
                  <td className="py-3 px-4">{driver.name}</td>
                  <td className="py-3 px-4">{driver.phone}</td>
                  <td className="py-3 px-4">{driver.isActive ? "Active" : "Inactive"}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {driver.lastLocationUpdate ? new Date(driver.lastLocationUpdate).toLocaleString() : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
