import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package2, Truck, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { data: orders = [] } = trpc.orders.list.useQuery();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();

  // Filter orders for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter((o: any) => {
    const orderDate = new Date(o.createdAt);
    orderDate.setHours(0, 0, 0, 0);
    return orderDate.getTime() === today.getTime();
  });

  const pendingOrders = todayOrders.filter((o: any) => o.status === "Pending").length;
  const onTheWayOrders = todayOrders.filter((o: any) => o.status === "On the Way").length;
  const deliveredOrders = todayOrders.filter((o: any) => o.status === "Delivered").length;
  const activeDrivers = drivers.filter((d: any) => d.isActive).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Package2 className="w-6 h-6" />} label="Pending" value={pendingOrders} color="bg-yellow-100 text-yellow-700" />
        <StatCard icon={<Truck className="w-6 h-6" />} label="On the Way" value={onTheWayOrders} color="bg-blue-100 text-blue-700" />
        <StatCard icon={<TrendingUp className="w-6 h-6" />} label="Delivered" value={deliveredOrders} color="bg-green-100 text-green-700" />
        <StatCard icon={<Truck className="w-6 h-6" />} label="Active Drivers" value={activeDrivers} color="bg-purple-100 text-purple-700" />
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Today's Orders</h2>
        {todayOrders.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No orders today</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Order ID</th>
                  <th className="text-left py-3 px-4 font-semibold">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-right py-3 px-4 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {todayOrders.slice(0, 10).map((order: any) => (
                  <tr key={order.id} className="border-b border-border hover:bg-muted/30">
                    <td className="py-3 px-4">#{order.id}</td>
                    <td className="py-3 px-4">{order.customer?.name}</td>
                    <td className="py-3 px-4"><Badge className={getStatusBadgeClass(order.status)}>{order.status}</Badge></td>
                    <td className="py-3 px-4 text-right">${order.totalPrice}</td>
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

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card className="p-6">
      <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center mb-4`}>{icon}</div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </Card>
  );
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "Pending": return "bg-yellow-100 text-yellow-800";
    case "On the Way": return "bg-blue-100 text-blue-800";
    case "Delivered": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
}
