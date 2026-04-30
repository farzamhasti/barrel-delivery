import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { MapView } from "@/components/Map";
import { useRef, useState, useEffect } from "react";

interface FullscreenMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCenter: { lat: number; lng: number };
  initialZoom: number;
  onMapReady: (map: google.maps.Map) => void;
  title?: string;
}

export function FullscreenMapModal({
  isOpen,
  onClose,
  initialCenter,
  initialZoom,
  onMapReady,
  title = "Map View",
}: FullscreenMapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const mapReadyRef = useRef(false);

  // Trigger map refresh when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset the map ready flag to force re-initialization
      mapReadyRef.current = false;
      
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        // Trigger the onMapReady callback to reinitialize markers
        if (mapContainerRef.current) {
          // Force a re-render by triggering map initialization
          mapReadyRef.current = true;
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleMapReady = (map: google.maps.Map) => {
    // Always call the parent's onMapReady to reinitialize markers
    onMapReady(map);
    mapReadyRef.current = true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${isMaximized ? 'max-w-full h-screen' : 'max-w-7xl h-[90vh]'} p-0 flex flex-col transition-all duration-300`}>
        <DialogHeader className="p-4 border-b border-border flex-shrink-0 bg-background">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Maximize2 className="w-5 h-5 text-blue-600" />
              <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMaximized(!isMaximized)}
                className="h-8 w-8 p-0 hover:bg-muted"
                title={isMaximized ? "Minimize" : "Maximize"}
              >
                {isMaximized ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-muted"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Map Container - Only render when modal is open */}
        {isOpen && (
          <div ref={mapContainerRef} className="flex-1 overflow-hidden">
            <MapView
              key={`map-${isOpen}`}
              initialCenter={initialCenter}
              initialZoom={initialZoom}
              onMapReady={handleMapReady}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
