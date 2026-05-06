'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

// Restaurant location (224 Garrison Rd, Fort Erie, ON L2A 1M7)
const RESTAURANT_LAT = 42.9051676;
const RESTAURANT_LNG = -78.9458911;

// Driver colors for markers
const DRIVER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A9DFBF',
];

interface DriverPosition {
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface LiveDriverTrackingWindowProps {
  onClose: () => void;
  onMinimize?: (isMinimized: boolean) => void;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  initialIsMinimized?: boolean;
}

// Global state for minimized windows
let minimizedWindows: Map<string, { position: { x: number; y: number }; size: { width: number; height: number } }> = new Map();

export function LiveDriverTrackingWindow({ onClose, onMinimize, initialPosition, initialSize, initialIsMinimized }: LiveDriverTrackingWindowProps) {
  const [drivers, setDrivers] = useState<DriverPosition[]>([]);
  const [isMinimized, setIsMinimized] = useState(initialIsMinimized || false);
  const [position, setPosition] = useState(initialPosition || { x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState(initialSize || { width: 600, height: 500 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const getActiveDriversQuery = trpc.gps.getActiveDrivers.useQuery();

  // Fetch drivers every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      getActiveDriversQuery.refetch();
    }, 10000);

    return () => clearInterval(interval);
  }, [getActiveDriversQuery]);

  // Update drivers when query data changes
  useEffect(() => {
    if (getActiveDriversQuery.data) {
      setDrivers(getActiveDriversQuery.data as DriverPosition[]);
    }
  }, [getActiveDriversQuery.data]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newPos = {
          x: Math.max(0, e.clientX - dragOffset.x),
          y: Math.max(0, e.clientY - dragOffset.y),
        };
        setPosition(newPos);
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const newSize = {
          width: Math.max(300, resizeStart.width + deltaX),
          height: Math.max(200, resizeStart.height + deltaY),
        };
        setSize(newSize);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, isResizing, resizeStart]);

  const handleMinimize = () => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    if (newMinimized) {
      minimizedWindows.set('liveDriverTracking', { position, size });
    } else {
      minimizedWindows.delete('liveDriverTracking');
    }
    onMinimize?.(newMinimized);
  };

  const getDriverColor = (index: number) => {
    return DRIVER_COLORS[index % DRIVER_COLORS.length];
  };

  const createColoredIcon = (color: string) => {
    return L.divIcon({
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background-color: ${color};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          font-weight: bold;
          color: white;
          font-size: 12px;
        ">
          🚗
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  };

  const restaurantIcon = L.divIcon({
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background-color: #FF6B35;
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        font-size: 20px;
      ">
        🍕
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });

  return (
    <div
      ref={windowRef}
      className="fixed bg-white rounded-lg shadow-2xl border border-border z-50 flex flex-col"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? '300px' : `${size.width}px`,
        height: isMinimized ? '40px' : `${size.height}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Header - Draggable */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg cursor-grab active:cursor-grabbing"
      >
        <h3 className="font-semibold text-sm text-foreground">Live Driver Tracking</h3>
        <div className="flex gap-2" data-no-drag>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMinimize}
            className="h-6 w-6 p-0"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-hidden">
            <MapContainer
              center={[RESTAURANT_LAT, RESTAURANT_LNG]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />

              {/* Restaurant marker */}
              <Marker position={[RESTAURANT_LAT, RESTAURANT_LNG]} icon={restaurantIcon}>
                <Popup>
                  <div className="text-sm font-semibold">The Barrel Restaurant</div>
                </Popup>
              </Marker>

              {/* Driver markers */}
              {drivers.map((driver, index) => (
                <Marker
                  key={driver.driverId}
                  position={[driver.latitude, driver.longitude]}
                  icon={createColoredIcon(getDriverColor(index))}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold">Driver {driver.driverId}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(driver.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute bottom-0 right-0 w-4 h-4 bg-blue-400 cursor-se-resize rounded-tl"
            style={{ cursor: 'nwse-resize' }}
          />
        </>
      )}

      {/* Minimized State Info */}
      {isMinimized && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          {drivers.length} active drivers • Updates every 10s
        </div>
      )}
    </div>
  );
}
