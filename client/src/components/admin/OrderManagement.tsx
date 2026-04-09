import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function OrderManagement() {
  const { data: orders = [] } = trpc.orders.list.useQuery();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const assignMutation = trpc.orders.assignDriver.useMutation();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Order Management</h2>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Order</th>
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-left py-3 px-4">Driver</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Total</th>
                <th className="text-center py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => (
                <tr key={order.id} className="border-b hover:bg-muted/30">
                  <td className="py-3 px-4">#{order.id}</td>
                  <td className="py-3 px-4">{order.customer?.name}</td>
                  <td className="py-3 px-4">{order.driver?.name || "Unassigned"}</td>
                  <td className="py-3 px-4"><Badge>{order.status}</Badge></td>
                  <td className="py-3 px-4 text-right">${order.totalPrice}</td>
                  <td className="py-3 px-4 text-center">
                    {!order.driverId && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            assignMutation.mutate({ orderId: order.id, driverId: parseInt(e.target.value) });
                          }
                        }}
                        className="text-xs"
                      >
                        <option value="">Assign</option>
                        {drivers.map((d: any) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    )}
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
