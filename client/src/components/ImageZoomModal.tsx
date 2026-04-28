import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";

interface ImageZoomModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageAlt: string;
  onClose: () => void;
}

export function ImageZoomModal({ isOpen, imageUrl, imageAlt, onClose }: ImageZoomModalProps) {
  const [zoom, setZoom] = useState(100);
  const [touchDistance, setTouchDistance] = useState(0);
  const maxZoom = 300;
  const minZoom = 50;
  const zoomStep = 25;
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate distance between two touch points for pinch detection
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length !== 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle touch start - record initial distance for pinch
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      setTouchDistance(getTouchDistance(e.touches));
    }
  };

  // Handle touch move - pinch to zoom
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchDistance > 0) {
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / touchDistance;
      
      // Calculate new zoom level based on pinch distance
      const newZoom = Math.round(zoom * scale);
      
      // Constrain zoom within limits
      if (newZoom >= minZoom && newZoom <= maxZoom) {
        setZoom(newZoom);
        setTouchDistance(currentDistance);
      }
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    setTouchDistance(0);
  };

  // Handle click to zoom (desktop) - each click increases zoom
  const handleImageClick = () => {
    const newZoom = zoom + zoomStep;
    if (newZoom <= maxZoom) {
      setZoom(newZoom);
    } else {
      // If at max, reset to normal
      setZoom(100);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + zoomStep, maxZoom));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - zoomStep, minZoom));
  };

  const handleReset = () => {
    setZoom(100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between w-full">
            <DialogTitle>Receipt Image Viewer</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= minZoom}
            className="flex items-center gap-1"
          >
            <ZoomOut className="w-4 h-4" />
            Zoom Out
          </Button>

          <div className="flex items-center gap-2 px-3 py-1 bg-white rounded border border-gray-300">
            <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= maxZoom}
            className="flex items-center gap-1"
          >
            <ZoomIn className="w-4 h-4" />
            Zoom In
          </Button>

          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 px-2 py-1">
          <span className="hidden sm:inline">Desktop: Click image to zoom in • </span>
          <span className="sm:hidden">Touch: Pinch to zoom • </span>
          <span>Use buttons to adjust or reset</span>
        </div>

        {/* Image Container */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto flex items-center justify-center bg-gray-100 rounded-lg border border-gray-300 p-4 select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={imageUrl}
            alt={imageAlt}
            onClick={handleImageClick}
            style={{
              width: `${zoom}%`,
              height: "auto",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              transition: "width 0.2s ease-out",
              cursor: "pointer",
            }}
            className="rounded"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
