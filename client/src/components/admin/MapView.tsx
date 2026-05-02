import { MapView } from "@/components/Map";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function AdminMapView() {
  const { data: orders = [] } = trpc.orders.list.useQuery();
  const { data: drivers = [] } = trpc.drivers.list.useQuery();

  const activeOrders = orders.filter((o: any) => o.status !== "Delivered");

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Live Delivery Map</h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <Card className="p-4 h-96 lg:h-[600px]">
            <MapView
              onMapReady={(map: any) => {
                // Center map on first active order or default to US
                if (activeOrders.length > 0) {
                  map.setCenter({ lat: 40.7128, lng: -74.0060 });
                  map.setZoom(12);
                }
              }}
            />
          </Card>
        </div>

        {/* Legend & Info */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold text-foreground mb-4">Active Deliveries</h3>
            <div className="space-y-3">
              {activeOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active deliveries</p>
              ) : (
                activeOrders.map((order: any) => (
                  <div key={order.id} className="text-sm border-b border-border pb-2 last:border-0">
                    <p className="font-medium text-foreground">Order #{order.id}</p>
                    <p className="text-xs text-muted-foreground">Customer ID: {order.customerId}</p>
                    <p className="text-xs text-muted-foreground">{order.driver?.name || "Unassigned"}"</p>
                    <span className={`inline-block text-xs px-2 py-1 rounded mt-1 ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-foreground mb-4">Drivers Online</h3>
            <div className="space-y-2">
              {drivers.filter((d: any) => d.isActive).length === 0 ? (
                <p className="text-sm text-muted-foreground">No active drivers</p>
              ) : (
                drivers
                  .filter((d: any) => d.isActive)
                  .map((driver: any) => (
                    <div key={driver.id} className="text-sm flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-foreground">{driver.name}</span>
                    </div>
                  ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "Pending":
      return "bg-yellow-100 text-yellow-800";
    case "On the Way":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
