import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart3, Map as MapIcon, Layers } from "lucide-react";
import { GISGeographicDistribution } from "./GISGeographicDistribution";
import { GISDeliveryPerformance } from "./GISDeliveryPerformance";
import { GISDriverPerformance } from "./GISDriverPerformance";
import { GISGrowthOpportunities } from "./GISGrowthOpportunities";
import { GISTimeAnalysis } from "./GISTimeAnalysis";

type ViewType = "google" | "gis" | "chart";

interface AnalyticsSectionModalWithGISProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  sectionType: "geographic" | "time" | "performance" | "driver" | "growth";
  data?: any;
}

export function AnalyticsSectionModalWithGIS({
  isOpen,
  onClose,
  title,
  description,
  sectionType,
  data,
}: AnalyticsSectionModalWithGISProps) {
  const [activeView, setActiveView] = useState<ViewType>("google");

  const renderGISMap = () => {
    switch (sectionType) {
      case "geographic":
        return (
          <GISGeographicDistribution
            data={{
              downtown: data?.geographicStats?.downtown || 0,
              centralPark: data?.geographicStats?.centralPark || 0,
              both: data?.geographicStats?.both || 0,
            }}
          />
        );
      case "time":
        return <GISTimeAnalysis data={data?.timeAnalysis} />;
      case "performance":
        return (
          <GISDeliveryPerformance
            data={{
              downtown: { avgTime: data?.performanceStats?.downtown?.avgTime || 0 },
              centralPark: { avgTime: data?.performanceStats?.centralPark?.avgTime || 0 },
              both: { avgTime: data?.performanceStats?.both?.avgTime || 0 },
            }}
          />
        );
      case "driver":
        return (
          <GISDriverPerformance
            drivers={
              data?.drivers || [
                { name: "Driver 1", color: "#FF6B6B", deliveries: 5, avgTime: 18 },
                { name: "Driver 2", color: "#4ECDC4", deliveries: 8, avgTime: 22 },
              ]
            }
          />
        );
      case "growth":
        return (
          <GISGrowthOpportunities
            zones={
              data?.zones || [
                { name: "Zone A", lat: 42.98, lng: -79.05, orderCount: 3, avgDeliveryTime: 25 },
                { name: "Zone B", lat: 42.99, lng: -79.06, orderCount: 12, avgDeliveryTime: 40 },
              ]
            }
          />
        );
      default:
        return <div className="text-gray-500">GIS map not available for this section</div>;
    }
  };

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

        {/* View Toggle */}
        <div className="flex gap-2 border-b pb-4">
          <Button
            variant={activeView === "google" ? "default" : "outline"}
            onClick={() => setActiveView("google")}
            size="sm"
            className="gap-2"
          >
            <MapIcon className="w-4 h-4" />
            Google Maps
          </Button>
          <Button
            variant={activeView === "gis" ? "default" : "outline"}
            onClick={() => setActiveView("gis")}
            size="sm"
            className="gap-2"
          >
            <Layers className="w-4 h-4" />
            GIS Map
          </Button>
          <Button
            variant={activeView === "chart" ? "default" : "outline"}
            onClick={() => setActiveView("chart")}
            size="sm"
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Chart/Table
          </Button>
        </div>

        {/* Content */}
        <div className="py-4">
          {activeView === "google" && (
            <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">{title} - Google Maps View</p>
              </div>
            </div>
          )}

          {activeView === "gis" && (
            <div className="space-y-4">
              {renderGISMap()}
            </div>
          )}

          {activeView === "chart" && (
            <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">{title} - Charts & Tables</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
