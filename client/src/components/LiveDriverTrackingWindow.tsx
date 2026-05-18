import { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

// Restaurant location (224 Garrison Rd, Fort Erie, ON L2A 1M7)
const RESTAURANT_LAT = 42.9052194;
const RESTAURANT_LNG = -78.9232931;

// Driver colors for markers
const DRIVER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A9DFBF',
];

interface DriverPosition {
  driverId: number | string;
  driverName: string;
  status: string;
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
          width: Math.max(400, resizeStart.width + deltaX),
          height: Math.max(300, resizeStart.height + deltaY),
        };
        setSize(newSize);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, resizeStart]);

  const handleMinimize = useCallback(() => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    onMinimize?.(newMinimized);

    if (newMinimized) {
      minimizedWindows.set('tracking', { position, size });
    } else {
      minimizedWindows.delete('tracking');
    }
  }, [isMinimized, position, size, onMinimize]);

  const createDriverIcon = (color: string, driverName: string) => {
    return L.divIcon({
      html: `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        ">
          <div style="
            width: 52px;
            height: 52px;
            background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
            border: 3px solid white;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3);
            font-weight: bold;
            color: white;
            font-size: 28px;
            position: relative;
            transform: perspective(600px) rotateX(5deg);
          ">
            🚗
            <div style="
              position: absolute;
              bottom: -8px;
              right: -8px;
              background-color: #10b981;
              color: white;
              border: 2px solid white;
              border-radius: 50%;
              width: 22px;
              height: 22px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: bold;
              box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            ">
              ✓
            </div>
          </div>
          <div style="
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%);
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
            letter-spacing: 0.3px;
            border: 1px solid rgba(255,255,255,0.2);
          ">
            ${driverName}
          </div>
        </div>
      `,
      iconSize: [70, 80],
      iconAnchor: [35, 75],
      popupAnchor: [0, -75],
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
              center={[RESTAURANT_LAT, RESTAURANT_LNG] as any}
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
                  <div className="text-center">
                    <p className="font-bold">The Barrel Restaurant</p>
                    <p className="text-sm text-gray-600">224 Garrison Rd</p>
                  </div>
                </Popup>
              </Marker>

              {/* Driver markers */}
              {drivers.map((driver, index) => (
                <Marker
                  key={driver.driverId}
                  position={[driver.latitude, driver.longitude]}
                  icon={createDriverIcon(DRIVER_COLORS[index % DRIVER_COLORS.length], driver.driverName)}
                >
                  <Popup>
                    <div className="text-center">
                      <p className="font-bold">{driver.driverName}</p>
                      <p className="text-sm text-gray-600 capitalize">{driver.status}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(driver.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Footer - Resize handle */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="h-2 bg-gray-200 hover:bg-gray-300 cursor-se-resize rounded-b-lg"
            style={{ cursor: 'se-resize' }}
          />
        </>
      )}
    </div>
  );
}
