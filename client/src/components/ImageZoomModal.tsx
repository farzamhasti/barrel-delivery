import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ImageZoomModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageAlt: string;
  onClose: () => void;
}

export function ImageZoomModal({ isOpen, imageUrl, imageAlt, onClose }: ImageZoomModalProps) {
  const [zoom, setZoom] = useState(100);
  const maxZoom = 300;
  const minZoom = 50;
  const zoomStep = 25;

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

        {/* Image Container */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-100 rounded-lg border border-gray-300 p-4">
          <img
            src={imageUrl}
            alt={imageAlt}
            style={{
              width: `${zoom}%`,
              height: "auto",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
            className="rounded"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
