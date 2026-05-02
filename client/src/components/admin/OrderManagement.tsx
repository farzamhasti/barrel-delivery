import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function OrderManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders = [] } = trpc.orders.list.useQuery();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();
  const assignMutation = trpc.orders.assignDriver.useMutation();

  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch =
      order.id.toString().includes(searchTerm) ||
      order.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.phone.includes(searchTerm);

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Order Management</h2>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by order ID, customer name, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Ready">Ready</SelectItem>
              <SelectItem value="On the Way">On the Way</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Orders Table */}
      <Card className="p-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Order</th>
                  <th className="text-left py-3 px-4 font-semibold">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold">Driver</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-right py-3 px-4 font-semibold">Total</th>
                  <th className="text-center py-3 px-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order: any) => (
                  <tr key={order.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4">#{order.id}</td>
                    <td className="py-3 px-4">{order.customer?.name}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{order.customer?.phone}</td>
                    <td className="py-3 px-4">{order.driver?.name || "Unassigned"}</td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusBadgeClass(order.status)}>{order.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">${order.totalPrice}</td>
                    <td className="py-3 px-4 text-center">
                      {!order.driverId && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              assignMutation.mutate(
                                { orderId: order.id, driverId: parseInt(e.target.value) },
                                {
                                  onSuccess: () => {
                                    trpc.useUtils().orders.list.invalidate();
                                  },
                                }
                              );
                            }
                          }}
                          className="text-xs px-2 py-1 rounded border border-border"
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
        )}
      </Card>

      {/* Summary */}
      <Card className="p-4 bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Showing {filteredOrders.length} of {orders.length} orders
        </p>
      </Card>
    </div>
  );
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "Pending":
      return "bg-yellow-100 text-yellow-800";
    case "Ready":
      return "bg-orange-100 text-orange-800";
    case "On the Way":
      return "bg-blue-100 text-blue-800";
    case "Delivered":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
