import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DurationInfo {
  totalSeconds: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

interface OrderTimeline {
  orderId: number;
  customerName: string;
  customerAddress: string;
  status: string;
  timestamps: {
    pending: Date | null;
    ready: Date | null;
    onTheWay: Date | null;
    delivered: Date | null;
  };
  durations: {
    pending: DurationInfo | null;
    ready: DurationInfo | null;
    onTheWay: DurationInfo | null;
    delivered: string | null;
  };
}

interface OrderTimelineTableProps {
  timelines: OrderTimeline[];
  isLoading?: boolean;
}

const formatTime = (date: Date | null) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "Pending":
      return "bg-gray-200 text-gray-800";
    case "Ready":
      return "bg-yellow-200 text-yellow-800";
    case "On the Way":
      return "bg-blue-200 text-blue-800";
    case "Delivered":
      return "bg-green-200 text-green-800";
    default:
      return "bg-gray-200 text-gray-800";
  }
};

const formatDuration = (duration: DurationInfo | null) => {
  if (!duration) return "N/A";
  return duration.formatted;
};

export function OrderTimelineTable({ timelines, isLoading }: OrderTimelineTableProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500">Loading order timelines...</p>
        </div>
      </Card>
    );
  }

  if (!timelines || timelines.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500">No orders found for the selected date range.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 overflow-x-auto">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead className="font-semibold">Order ID</TableHead>
              <TableHead className="font-semibold">Customer</TableHead>
              <TableHead className="font-semibold">Address</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-center">Pending Time (MM:SS)</TableHead>
              <TableHead className="font-semibold text-center">Ready Time (MM:SS)</TableHead>
              <TableHead className="font-semibold text-center">On the Way Time (MM:SS)</TableHead>
              <TableHead className="font-semibold text-center">Delivered Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {timelines.map((timeline) => (
              <TableRow key={timeline.orderId} className="hover:bg-gray-50">
                <TableCell className="font-medium text-blue-600">#{timeline.orderId}</TableCell>
                <TableCell className="text-sm">{timeline.customerName}</TableCell>
                <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                  {timeline.customerAddress}
                </TableCell>
                <TableCell>
                  <Badge className={`${getStatusBadgeColor(timeline.status)}`}>
                    {timeline.status}
                  </Badge>
                </TableCell>
                
                {/* Pending Time Duration */}
                <TableCell className="text-center text-sm font-medium">
                  {timeline.durations.pending ? (
                    <div className="flex flex-col items-center">
                      <span className="text-blue-600 font-bold">{formatDuration(timeline.durations.pending)}</span>
                      <span className="text-xs text-gray-500">Order placed to Ready</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </TableCell>

                {/* Ready Time Duration */}
                <TableCell className="text-center text-sm font-medium">
                  {timeline.durations.ready ? (
                    <div className="flex flex-col items-center">
                      <span className="text-yellow-600 font-bold">{formatDuration(timeline.durations.ready)}</span>
                      <span className="text-xs text-gray-500">Ready to On the Way</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </TableCell>

                {/* On the Way Time Duration */}
                <TableCell className="text-center text-sm font-medium">
                  {timeline.durations.onTheWay ? (
                    <div className="flex flex-col items-center">
                      <span className="text-blue-600 font-bold">{formatDuration(timeline.durations.onTheWay)}</span>
                      <span className="text-xs text-gray-500">On the Way to Delivered</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </TableCell>

                {/* Delivered Time Timestamp */}
                <TableCell className="text-center text-sm">
                  {timeline.durations.delivered ? (
                    <div className="flex flex-col items-center">
                      <span className="text-green-600 font-bold">{timeline.durations.delivered}</span>
                      <span className="text-xs text-gray-500">Delivery completed</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm font-semibold text-blue-900 mb-2">Column Descriptions:</p>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Pending Time:</strong> Duration from order placed until kitchen marks it as Ready</li>
          <li><strong>Ready Time:</strong> Duration from Ready status until sent to driver (On the Way)</li>
          <li><strong>On the Way Time:</strong> Duration from driver pickup until delivery completion</li>
          <li><strong>Delivered Time:</strong> Exact timestamp when driver clicked Delivered</li>
        </ul>
      </div>
    </Card>
  );
}
