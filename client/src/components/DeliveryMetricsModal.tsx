import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeliveryMetricsTable } from "@/components/DeliveryMetricsTable";

interface DeliveryMetric {
  id: number;
  orderNumber: string;
  driverName: string | null;
  waitTime: number;
  readyTime: number;
  enRouteTime: number;
  deliveryTime: string;
}

interface DeliveryMetricsModalProps {
  isOpen: boolean;
  metrics: DeliveryMetric[];
  isLoading: boolean;
  onClose: () => void;
}

export function DeliveryMetricsModal({
  isOpen,
  metrics,
  isLoading,
  onClose,
}: DeliveryMetricsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">Delivery Times Breakdown</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <p className="text-sm text-gray-600 mb-4">
            Detailed breakdown of each order's delivery timeline
          </p>
          <DeliveryMetricsTable metrics={metrics} isLoading={isLoading} />
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end">
          <Button onClick={onClose} className="px-6">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
