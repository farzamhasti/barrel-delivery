import { useMemo } from "react";

interface Timeline {
  orderId: number;
  customerName: string;
  pendingTime?: string;
  readyTime?: string;
  onWayTime?: string;
  deliveredTime?: string;
}

export function DeliveryGanttChart({ timelines, isLoading }: { timelines: Timeline[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="text-center py-8">Loading chart...</div>;
  }

  if (!timelines || timelines.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No delivery data available</div>;
  }

  const chartData = useMemo(() => {
    return timelines.map((timeline) => {
      const statuses = [
        { name: "Pending", time: timeline.pendingTime },
        { name: "Ready", time: timeline.readyTime },
        { name: "On Way", time: timeline.onWayTime },
        { name: "Delivered", time: timeline.deliveredTime },
      ].filter((s) => s.time);

      return {
        orderId: timeline.orderId,
        customer: timeline.customerName,
        statuses,
      };
    });
  }, [timelines]);

  const statusColors: { [key: string]: string } = {
    Pending: "bg-gray-300",
    Ready: "bg-yellow-300",
    "On Way": "bg-blue-400",
    Delivered: "bg-green-400",
  };

  return (
    <div className="overflow-x-auto">
      <div className="space-y-4 min-w-max">
        {chartData.map((item) => (
          <div key={item.orderId} className="flex items-center gap-4">
            <div className="w-32 text-sm font-medium truncate">
              Order #{item.orderId} - {item.customer}
            </div>
            <div className="flex gap-2">
              {item.statuses.map((status, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-2 rounded text-xs font-medium text-white ${
                    statusColors[status.name] || "bg-gray-400"
                  }`}
                >
                  {status.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-muted-foreground">
          <strong>Timeline Legend:</strong> Each colored box represents a delivery status. The order flows from left to right (Pending → Ready → On Way → Delivered).
        </p>
      </div>
    </div>
  );
}
