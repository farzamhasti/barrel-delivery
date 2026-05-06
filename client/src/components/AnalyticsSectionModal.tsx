import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BarChart3, Map as MapIcon } from "lucide-react";

interface AnalyticsSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  mapPlaceholder: string;
  chartPlaceholder: string;
}

export function AnalyticsSectionModal({
  isOpen,
  onClose,
  title,
  description,
  mapPlaceholder,
  chartPlaceholder,
}: AnalyticsSectionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Map View */}
          <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <MapIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">{mapPlaceholder}</p>
            </div>
          </div>

          {/* Chart/Table View */}
          <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">{chartPlaceholder}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
