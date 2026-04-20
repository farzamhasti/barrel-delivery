import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, AlertCircle, Loader2 } from "lucide-react";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { useRef, useEffect, useState } from "react";

export interface OrderMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: number;
    customerAddress?: string;
    area?: string;
    status: string;
    customer?: {
      name: string;
      phone?: string;
      address: string;
      latitude?: number | string;
      longitude?: number | string;
    };
    items?: Array<{
      quantity: number;
      menuItemName: string;
    }>;
    totalPrice?: number;
    notes?: string;
    createdAt?: string;
  };
}

// Correct restaurant location: 224 Garrison Rd, Fort Erie, ON L2A 1M7
// Exact coordinates from Google Maps
const RESTAURANT_LOCATION = { lat: 42.905191, lng: -78.9225479 };

export function OrderMapModal({ open, onOpenChange, order }: OrderMapModalProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const [geocodedLocation, setGeocodedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clear all scheduled timeouts
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current = [];
      // Clear markers and info windows
      markersRef.current.forEach(marker => marker.setMap(null));
      infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
      markersRef.current = [];
      infoWindowsRef.current = [];
    };
  }, []);

  // Use geocoding mutation to convert address to coordinates
  const geocodeMutation = (trpc as any).maps.geocode.useMutation({
    onSuccess: (result: any) => {
      if (!isMountedRef.current) return;
      console.log('[OrderMapModal] Geocoding succeeded:', result);
      if ("error" in result) {
        setGeocodeError(result.error);
        setIsGeocoding(false);
      } else {
        setGeocodedLocation({
          lat: result.latitude,
          lng: result.longitude,
        });
        setGeocodeError(null);
        setIsGeocoding(false);
      }
    },
    onError: (error: any) => {
      if (!isMountedRef.current) return;
      console.error('[OrderMapModal] Geocoding failed:', error);
      setGeocodeError(error.message || "Failed to geocode address");
      setIsGeocoding(false);
    },
  });

  // Geocode address when modal opens or order changes
  useEffect(() => {
    if (!open) {
      console.log('[OrderMapModal] Modal closed, resetting state');
      // Reset map state when modal closes
      setGeocodedLocation(null);
      setMapReady(false);
      setGeocodeError(null);
      // Clear markers and info windows
      markersRef.current.forEach(marker => marker.setMap(null));
      infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
      markersRef.current = [];
      infoWindowsRef.current = [];
      // Reset map ref
      mapRef.current = null;
      return;
    }

    console.log('[OrderMapModal] Modal opened or order changed, order ID:', order.id);

    // Clear previous markers when order changes
    markersRef.current.forEach(marker => marker.setMap(null));
    infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
    markersRef.current = [];
    infoWindowsRef.current = [];

    // Reset map ready state to force map recreation
    setMapReady(false);
    setGeocodeError(null);

    // Check if we already have coordinates from customer data
    if (
      order.customer?.latitude &&
      order.customer?.longitude
    ) {
      const lat = parseFloat(order.customer.latitude as any);
      const lng = parseFloat(order.customer.longitude as any);
      if (!isNaN(lat) && !isNaN(lng)) {
        console.log('[OrderMapModal] Using customer coordinates:', { lat, lng });
        if (isMountedRef.current) {
          setGeocodedLocation({ lat, lng });
        }
        return;
      }
    }

    // Otherwise, geocode the address
    const address = order.customerAddress || order.customer?.address;
    if (address && isMountedRef.current) {
      console.log('[OrderMapModal] Geocoding address:', address);
      setIsGeocoding(true);
      geocodeMutation.mutate({ address });
    }
  }, [open, order.id, order.customerAddress, order.customer?.address, order.customer?.latitude, order.customer?.longitude]);

  // Update map markers when location changes
  useEffect(() => {
    if (!mapReady || !mapRef.current || !geocodedLocation || !open || !isMountedRef.current) return;

    console.log('[OrderMapModal] Order changed, updating markers for order:', order.id);
    console.log('[OrderMapModal] New geocoded location:', geocodedLocation);

    // Clear existing markers and info windows FIRST
    markersRef.current.forEach(marker => marker.setMap(null));
    infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
    markersRef.current = [];
    infoWindowsRef.current = [];
    console.log('[OrderMapModal] Cleared previous markers and info windows');

    // Trigger map resize to ensure it renders properly when order changes
    try {
      google.maps.event.trigger(mapRef.current, 'resize');
      console.log('[OrderMapModal] Triggered map resize event');
    } catch (error) {
      console.error('[OrderMapModal] Error triggering map resize:', error);
    }

    try {
      // Safely escape HTML content to prevent injection
      const escapeHtml = (text: string) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      // Create info window for customer location with detailed order information
      const customerInfoContent = document.createElement('div');
      customerInfoContent.style.cssText = 'font-family: Arial, sans-serif; width: 280px;';
      customerInfoContent.innerHTML = `
        <div style="padding: 12px;">
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #1f2937;">
            Order #${escapeHtml(String(order.id))}
          </div>
          <div style="font-size: 13px; margin-bottom: 6px;">
            <strong>Customer:</strong> ${escapeHtml(order.customer?.name || 'N/A')}
          </div>
          <div style="font-size: 13px; margin-bottom: 6px;">
            <strong>Address:</strong> ${escapeHtml(order.customerAddress || order.customer?.address || 'N/A')}
          </div>
          <div style="font-size: 13px; margin-bottom: 6px;">
            <strong>Area:</strong> ${escapeHtml(order.area || 'N/A')}
          </div>
          <div style="font-size: 13px; margin-bottom: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <strong>Status:</strong> 
            <span style="display: inline-block; margin-left: 4px; padding: 4px 8px; background-color: #fbbf24; border-radius: 4px; font-weight: bold; color: #78350f;">
              ${escapeHtml(order.status)}
            </span>
          </div>
          ${order.notes ? `<div style="font-size: 12px; color: #6b7280; font-style: italic; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
            <strong>Notes:</strong> ${escapeHtml(order.notes)}
          </div>` : ''}
        </div>
      `;

      const customerInfoWindow = new google.maps.InfoWindow({
        content: customerInfoContent,
      });

      // Add customer location marker with larger, more visible styling
      if (!mapRef.current || !isMountedRef.current) return;
      console.log('Creating customer marker at:', geocodedLocation);
      const customerMarker = new google.maps.Marker({
        map: mapRef.current,
        position: geocodedLocation,
        title: `Order #${order.id} - ${order.customer?.name || 'Customer'}`,
        label: {
          text: `#${order.id}`,
          color: "white",
          fontSize: "16px",
          fontWeight: "bold",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 18,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 3,
        },
        animation: google.maps.Animation.DROP,
      });
      console.log('Customer marker created successfully');

      // Add click listener to show info window
      customerMarker.addListener('click', () => {
        // Close all other info windows
        infoWindowsRef.current.forEach(iw => iw.close());
        if (mapRef.current) {
          customerInfoWindow.open(mapRef.current, customerMarker);
        }
      });

      // Open info window by default
      if (mapRef.current) {
        customerInfoWindow.open(mapRef.current, customerMarker);
      }
      infoWindowsRef.current.push(customerInfoWindow);
      markersRef.current.push(customerMarker);
      console.log('Customer marker added to map, total markers:', markersRef.current.length);

      // Create info window for restaurant
      const restaurantInfoContent = document.createElement('div');
      restaurantInfoContent.style.cssText = 'font-family: Arial, sans-serif;';
      restaurantInfoContent.innerHTML = `
        <div style="padding: 12px;">
          <div style="font-weight: bold; font-size: 16px; color: #1f2937;">
            🍽️ Restaurant
          </div>
          <div style="font-size: 13px; margin-top: 4px; color: #6b7280;">
            Order Preparation Point
          </div>
        </div>
      `;

      const restaurantInfoWindow = new google.maps.InfoWindow({
        content: restaurantInfoContent,
      });

      // Add restaurant marker with larger, more visible styling
      if (!mapRef.current || !isMountedRef.current) return;
      console.log('Creating restaurant marker at:', RESTAURANT_LOCATION);
      const restaurantMarker = new google.maps.Marker({
        map: mapRef.current,
        position: RESTAURANT_LOCATION,
        title: "Restaurant",
        label: {
          text: "🍽️",
          fontSize: "18px",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 16,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 3,
        },
        animation: google.maps.Animation.DROP,
      });
      console.log('Restaurant marker created successfully');

      // Add click listener to show info window
      restaurantMarker.addListener('click', () => {
        // Close all other info windows
        infoWindowsRef.current.forEach(iw => iw.close());
        if (mapRef.current) {
          restaurantInfoWindow.open(mapRef.current, restaurantMarker);
        }
      });

      infoWindowsRef.current.push(restaurantInfoWindow);
      markersRef.current.push(restaurantMarker);
      console.log('Restaurant marker added to map, total markers:', markersRef.current.length);

      // Fit bounds to show both markers
      if (mapRef.current && markersRef.current.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        markersRef.current.forEach(marker => {
          bounds.extend(marker.getPosition()!);
        });
        mapRef.current.fitBounds(bounds);
        console.log('[OrderMapModal] Map bounds fitted to markers');
      }
    } catch (error) {
      console.error('[OrderMapModal] Error displaying markers on map:', error);
      if (isMountedRef.current) {
        setGeocodeError("Failed to display markers on map");
      }
    }
  }, [mapReady, geocodedLocation, order.id, order.customer?.name, order.status, order.area, order.notes, open]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Ready":
        return "bg-green-100 text-green-800";
      case "On the Way":
        return "bg-blue-100 text-blue-800";
      case "Delivered":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        // Clean up when closing
        timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
        timeoutsRef.current = [];
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-5xl h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-4 pb-2">
          <DialogTitle>Order #{order.id} - Map View</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden px-6 pb-6">
          {/* Map Section - Full Width and Height */}
          <div className="flex-1 flex flex-col gap-2 min-h-0 bg-gray-100 rounded-lg overflow-hidden">
            {isGeocoding && (
              <div className="absolute top-4 left-4 z-10 flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-lg shadow-md">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-blue-700">Locating address...</span>
              </div>
            )}

            {geocodeError && (
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 p-3 bg-red-50 rounded-lg shadow-md">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700">{geocodeError}</span>
              </div>
            )}

            <MapView
              key={`map-${order.id}`}
              className="w-full h-full"
              initialCenter={geocodedLocation || RESTAURANT_LOCATION}
              initialZoom={14}
              onMapReady={(map) => {
                if (!isMountedRef.current) return;
                mapRef.current = map;
                setMapReady(true);
                // Trigger resize events for proper rendering with cleanup
                const timeout1 = setTimeout(() => {
                  if (map && isMountedRef.current) {
                    google.maps.event.trigger(map, 'resize');
                  }
                }, 50);
                const timeout2 = setTimeout(() => {
                  if (map && isMountedRef.current) {
                    google.maps.event.trigger(map, 'resize');
                  }
                }, 150);
                timeoutsRef.current.push(timeout1, timeout2);
              }}
            />
          </div>

          {/* Order Details Section - Below Map */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Status Card */}
            <Card className="p-3">
              <h3 className="font-semibold text-xs text-gray-600 mb-2">Status</h3>
              <Badge className={`${getStatusColor(order.status)} w-full justify-center`}>
                {order.status}
              </Badge>
            </Card>

            {/* Customer Info Card */}
            <Card className="p-3 lg:col-span-2">
              <h3 className="font-semibold text-xs text-gray-600 mb-2">Customer Info</h3>
              <div className="space-y-1 text-xs">
                {order.customer?.name && (
                  <div className="flex items-start gap-1">
                    <span className="text-gray-600 min-w-fit">Name:</span>
                    <span className="font-medium">{order.customer.name}</span>
                  </div>
                )}
                {order.customer?.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-gray-600 flex-shrink-0" />
                    <span className="font-medium">{order.customer.phone}</span>
                  </div>
                )}
                {(order.customerAddress || order.customer?.address) && (
                  <div className="flex items-start gap-1">
                    <MapPin className="w-3 h-3 text-gray-600 mt-0.5 flex-shrink-0" />
                    <span className="font-medium text-wrap">{order.customerAddress || order.customer?.address}</span>
                  </div>
                )}
                {order.area && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600">Area:</span>
                    <Badge variant="outline" className="text-xs">{order.area}</Badge>
                  </div>
                )}
              </div>
            </Card>

            {/* Total Card */}
            {order.totalPrice && (
              <Card className="p-3 bg-green-50 border-green-200">
                <h3 className="font-semibold text-xs text-gray-600 mb-2">Total</h3>
                <div className="text-lg font-bold text-green-700">${order.totalPrice.toFixed(2)}</div>
              </Card>
            )}
          </div>

          {/* Items and Notes Row */}
          {(order.items?.length || order.notes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Items Card */}
              {order.items && order.items.length > 0 && (
                <Card className="p-3">
                  <h3 className="font-semibold text-xs text-gray-600 mb-2">Items</h3>
                  <div className="space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span>{item.menuItemName}</span>
                        <span className="text-gray-600">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Notes Card */}
              {order.notes && (
                <Card className="p-3">
                  <h3 className="font-semibold text-xs text-gray-600 mb-2">Notes</h3>
                  <p className="text-xs text-gray-700">{order.notes}</p>
                </Card>
              )}
            </div>
          )}

          {/* Close Button */}
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full"
            variant="outline"
            size="sm"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
