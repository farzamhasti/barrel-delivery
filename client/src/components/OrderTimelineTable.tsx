import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    pendingToReady: number | null;
    readyToOnTheWay: number | null;
    onTheWayToDelivered: number | null;
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
              <TableHead className="font-semibold text-center">Pending Time</TableHead>
              <TableHead className="font-semibold text-center">Ready Time</TableHead>
              <TableHead className="font-semibold text-center">On the Way Time</TableHead>
              <TableHead className="font-semibold text-center">Delivered Time</TableHead>
              <TableHead className="font-semibold text-center">Pending→Ready (min)</TableHead>
              <TableHead className="font-semibold text-center">Ready→Way (min)</TableHead>
              <TableHead className="font-semibold text-center">Way→Delivered (min)</TableHead>
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
                <TableCell className="text-center text-sm">
                  {timeline.timestamps.pending ? (
                    <div className="flex flex-col items-center">
                      <span className="text-gray-700">{formatTime(timeline.timestamps.pending)}</span>
                      <span className="text-xs text-gray-500">Pending</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {timeline.timestamps.ready ? (
                    <div className="flex flex-col items-center">
                      <span className="text-gray-700">{formatTime(timeline.timestamps.ready)}</span>
                      <span className="text-xs text-gray-500">Ready</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {timeline.timestamps.onTheWay ? (
                    <div className="flex flex-col items-center">
                      <span className="text-gray-700">{formatTime(timeline.timestamps.onTheWay)}</span>
                      <span className="text-xs text-gray-500">On Way</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {timeline.timestamps.delivered ? (
                    <div className="flex flex-col items-center">
                      <span className="text-gray-700">{formatTime(timeline.timestamps.delivered)}</span>
                      <span className="text-xs text-gray-500">Delivered</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm font-medium">
                  {timeline.durations.pendingToReady !== null ? (
                    <span className="text-blue-600">{timeline.durations.pendingToReady}</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm font-medium">
                  {timeline.durations.readyToOnTheWay !== null ? (
                    <span className="text-blue-600">{timeline.durations.readyToOnTheWay}</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm font-medium">
                  {timeline.durations.onTheWayToDelivered !== null ? (
                    <span className="text-green-600">{timeline.durations.onTheWayToDelivered}</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
