import { useCountdownTimer } from "@/hooks/useCountdownTimer";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

function DriverRowWithTimer({ driver, hasOnTheWayOrders }: { driver: any; hasOnTheWayOrders: boolean }) {
  const { displayTime } = useCountdownTimer(driver.estimatedReturnTime, driver.id);
  
  // Only show timer if driver has on_the_way orders AND has set estimated return time
  const shouldShowTimer = hasOnTheWayOrders && driver.estimatedReturnTime && driver.estimatedReturnTime > 0;
  
  return (
    <tr className="border-b border-border/40 hover:bg-muted/20">
      <td className="py-1 px-2 text-xs">{driver.name}</td>
      <td className="py-1 px-2">
        <Badge className="bg-green-100 text-green-800 text-xs h-5">Online</Badge>
      </td>
      <td className="py-1 px-2 text-xs text-muted-foreground font-mono">
        {shouldShowTimer ? displayTime : "00:00"}
      </td>
    </tr>
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
    <div className="overflow-x-auto">
      <table className="text-xs whitespace-nowrap">
        <thead>
          <tr className="border-b border-border/40">
            <th className="text-left py-1 px-2 font-semibold text-muted-foreground">Name</th>
            <th className="text-left py-1 px-2 font-semibold text-muted-foreground">Status</th>
            <th className="text-left py-1 px-2 font-semibold text-muted-foreground">Est. Return</th>
          </tr>
        </thead>
        <tbody>
          {activeDrivers.map((driver: any) => (
            <DriverRowWithTimer 
              key={driver.id} 
              driver={driver}
              hasOnTheWayOrders={driversWithOnTheWayOrders.has(driver.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
