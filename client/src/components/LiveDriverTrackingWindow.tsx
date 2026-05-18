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
          gap: 4px;
        ">
          <svg width="56" height="56" viewBox="0 0 56 56" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); transform: perspective(800px) rotateX(8deg) rotateZ(0deg);">
            <!-- Car body with 3D effect -->
            <defs>
              <linearGradient id="carGradient-${driverName}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${color};stop-opacity:0.85" />
              </linearGradient>
              <linearGradient id="windowGradient-${driverName}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#87CEEB;stop-opacity:0.6" />
                <stop offset="100%" style="stop-color:#4A90E2;stop-opacity:0.4" />
              </linearGradient>
            </defs>
            
            <!-- Main car body (top-down view) -->
            <path d="M 12 16 L 16 12 L 40 12 L 44 16 L 44 32 Q 44 36 40 36 L 16 36 Q 12 36 12 32 Z" fill="url(#carGradient-${driverName})" stroke="#333" stroke-width="1.5"/>
            
            <!-- Front bumper -->
            <rect x="14" y="10" width="28" height="2.5" fill="#222" rx="1"/>
            
            <!-- Front windshield -->
            <path d="M 18 14 L 22 12 L 34 12 L 38 14 Z" fill="url(#windowGradient-${driverName})" stroke="#666" stroke-width="0.8" opacity="0.8"/>
            
            <!-- Rear windshield -->
            <path d="M 18 32 L 22 34 L 34 34 L 38 32 Z" fill="url(#windowGradient-${driverName})" stroke="#666" stroke-width="0.8" opacity="0.7"/>
            
            <!-- Side windows -->
            <rect x="12" y="18" width="3" height="8" fill="url(#windowGradient-${driverName})" stroke="#666" stroke-width="0.6" opacity="0.7" rx="0.5"/>
            <rect x="41" y="18" width="3" height="8" fill="url(#windowGradient-${driverName})" stroke="#666" stroke-width="0.6" opacity="0.7" rx="0.5"/>
            
            <!-- Front lights -->
            <circle cx="16" cy="11" r="1.5" fill="#FFD700" opacity="0.9"/>
            <circle cx="40" cy="11" r="1.5" fill="#FFD700" opacity="0.9"/>
            
            <!-- Rear lights -->
            <circle cx="16" cy="35" r="1.2" fill="#FF4444" opacity="0.8"/>
            <circle cx="40" cy="35" r="1.2" fill="#FF4444" opacity="0.8"/>
            
            <!-- Wheels -->
            <circle cx="18" cy="14" r="2.5" fill="#111" stroke="#555" stroke-width="1"/>
            <circle cx="38" cy="14" r="2.5" fill="#111" stroke="#555" stroke-width="1"/>
            <circle cx="18" cy="32" r="2.5" fill="#111" stroke="#555" stroke-width="1"/>
            <circle cx="38" cy="32" r="2.5" fill="#111" stroke="#555" stroke-width="1"/>
            
            <!-- Wheel rims -->
            <circle cx="18" cy="14" r="1.2" fill="#888" opacity="0.6"/>
            <circle cx="38" cy="14" r="1.2" fill="#888" opacity="0.6"/>
            <circle cx="18" cy="32" r="1.2" fill="#888" opacity="0.6"/>
            <circle cx="38" cy="32" r="1.2" fill="#888" opacity="0.6"/>
            
            <!-- Direction arrow (pointing up) -->
            <polygon points="28,8 26,12 30,12" fill="#FFD700" opacity="0.9" stroke="#FF8C00" stroke-width="0.5"/>
            
            <!-- Active status badge -->
            <circle cx="46" cy="10" r="5" fill="#10b981" stroke="white" stroke-width="1.5" opacity="0.95"/>
            <text x="46" y="12" text-anchor="middle" font-size="6" font-weight="bold" fill="white">✓</text>
          </svg>
          
          <!-- Driver name label -->
          <div style="
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.8) 100%);
            color: white;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
            box-shadow: 0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15);
            letter-spacing: 0.4px;
            border: 1px solid rgba(255,255,255,0.25);
            text-transform: uppercase;
            max-width: 90px;
            overflow: hidden;
            text-overflow: ellipsis;
          ">
            ${driverName}
          </div>
        </div>
      `,
      iconSize: [70, 85],
      iconAnchor: [35, 80],
      popupAnchor: [0, -80],
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
