import { Check, Clock, Truck, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StatusEvent {
  status: string;
  timestamp: Date;
  duration?: number;
}

interface OrderStatusTimelineProps {
  events: StatusEvent[];
  currentStatus: string;
}

const statusConfig = {
  "Pending": { icon: Clock, color: "bg-gray-500", label: "Pending" },
  "Ready": { icon: Package, color: "bg-blue-500", label: "Ready" },
  "On the Way": { icon: Truck, color: "bg-yellow-500", label: "On the Way" },
  "Delivered": { icon: Check, color: "bg-green-500", label: "Delivered" },
};

export function OrderStatusTimeline({ events, currentStatus }: OrderStatusTimelineProps) {
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Order Status Timeline</CardTitle>
        <CardDescription>Track order progression through each status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-1 bg-gray-200" />

          {/* Timeline events */}
          <div className="space-y-6 relative z-10">
            {sortedEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No status transitions recorded
              </div>
            ) : (
              sortedEvents.map((event, index) => {
                const config = statusConfig[event.status as keyof typeof statusConfig];
                const Icon = config?.icon || Clock;
                const isLast = index === sortedEvents.length - 1;

                return (
                  <div key={index} className="flex gap-4">
                    {/* Status icon */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full ${config?.color || "bg-gray-500"} flex items-center justify-center text-white relative z-20`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* Event details */}
                    <div className="flex-grow pt-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">
                          {config?.label || event.status}
                        </h4>
                        <span className="text-sm text-gray-500">
                          {formatTime(new Date(event.timestamp))}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(new Date(event.timestamp))}
                      </p>
                      {event.duration && (
                        <p className="text-xs text-gray-500 mt-1">
                          Duration: {event.duration} minutes
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
