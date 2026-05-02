import { useCountdownTimer } from "@/hooks/useCountdownTimer";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

function DriverCard({ driver, hasOnTheWayOrders }: { driver: any; hasOnTheWayOrders: boolean }) {
  const { displayTime } = useCountdownTimer(driver.estimatedReturnTime, driver.id);
  
  // Only show timer if driver has on_the_way orders AND has set estimated return time
  const shouldShowTimer = hasOnTheWayOrders && driver.estimatedReturnTime && driver.estimatedReturnTime > 0;
  
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded border border-border/40 text-xs">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{driver.name}</div>
        <Badge className="bg-green-100 text-green-800 text-xs h-4 mt-1">Online</Badge>
      </div>
      <div className="text-right ml-2">
        <div className="font-mono text-muted-foreground">
          {shouldShowTimer ? displayTime : "00:00"}
        </div>
      </div>
    </div>
  );
}

export function HeaderDriversTable() {
  const { data: drivers = [] } = trpc.drivers.list.useQuery(undefined, {
    refetchInterval: 1000, // Refetch every 1 second to catch status changes and timer updates
  });
  const { data: orders = [] } = trpc.orders.getAll.useQuery(undefined, {
    refetchInterval: 2000, // Refetch orders every 2 seconds
  });

  // Memoize computed values to prevent infinite loops
  const { activeDrivers, driversWithOnTheWayOrders } = useMemo(() => {
    if (!drivers || drivers.length === 0) {
      return { activeDrivers: [], driversWithOnTheWayOrders: new Set<number>() };
    }

    const active = drivers.filter((d: any) => d.status === "online" && d.isActive);

    // Find drivers with on-the-way orders
    const driversWithOrders = new Set<number>();
    if (orders && orders.length > 0) {
      orders.forEach((order: any) => {
        if (order.status === "On the Way" && order.driverId) {
          driversWithOrders.add(order.driverId);
        }
      });
    }

    return { activeDrivers: active, driversWithOnTheWayOrders: driversWithOrders };
  }, [drivers, orders]);

  if (activeDrivers.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        No active drivers
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {activeDrivers.map((driver: any) => (
        <DriverCard 
          key={driver.id} 
          driver={driver}
          hasOnTheWayOrders={driversWithOnTheWayOrders.has(driver.id)}
        />
      ))}
    </div>
  );
}
