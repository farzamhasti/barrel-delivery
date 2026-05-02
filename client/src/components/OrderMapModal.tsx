'use client';

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, AlertCircle, Loader2 } from "lucide-react";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { useRef, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
      console.log('[OrderMapModal] Geocoding response received:', result);
      
      // Check if result has error field (geocoding service returned error)
      if (result && 'error' in result) {
        console.error('[OrderMapModal] Geocoding service error:', result.error);
        setGeocodeError(`Geocoding failed: ${result.error}`);
        setIsGeocoding(false);
        return;
      }
      
      // Check if we have valid coordinates
      if (result && typeof result.latitude === 'number' && typeof result.longitude === 'number') {
        console.log('[OrderMapModal] Geocoding success:', { lat: result.latitude, lng: result.longitude });
        setGeocodedLocation({
          lat: result.latitude,
          lng: result.longitude,
        });
        setGeocodeError(null);
        setIsGeocoding(false);
      } else {
        console.error('[OrderMapModal] Invalid response format:', result);
        setGeocodeError('Invalid geocoding response format');
        setIsGeocoding(false);
      }
    },
    onError: (error: any) => {
      if (!isMountedRef.current) return;
      console.error('[OrderMapModal] Geocoding mutation error:', error);
      console.error('[OrderMapModal] Error details:', {
        message: error?.message,
        code: error?.code,
        data: error?.data,
      });
      setGeocodeError('Failed to geocode address');
      setIsGeocoding(false);
    },
  });

  // Trigger geocoding when modal opens and address is available
  useEffect(() => {
    if (open && order.customerAddress && !geocodedLocation && !isGeocoding) {
      console.log('[OrderMapModal] Triggering geocoding for address:', order.customerAddress);
      setIsGeocoding(true);
      geocodeMutation.mutate({ address: order.customerAddress });
    }
  }, [open, order.customerAddress, geocodedLocation, isGeocoding, geocodeMutation]);

  // Add markers when geocoded location is ready
  useEffect(() => {
    if (!mapRef.current || !geocodedLocation || !mapReady) {
      console.log('[OrderMapModal] Skipping marker creation:', {
        hasMap: !!mapRef.current,
        hasLocation: !!geocodedLocation,
        mapReady,
      });
      return;
    }

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
      markersRef.current = [];
      infoWindowsRef.current = [];

      console.log('[OrderMapModal] Creating markers with geocoded location:', geocodedLocation);
      
      // Pan map to geocoded location
      if (mapRef.current) {
        mapRef.current.panTo(geocodedLocation);
        mapRef.current.setZoom(16);
      }

      // Escape HTML to prevent XSS
      const escapeHtml = (text: string) => {
        const map: { [key: string]: string } = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, m => map[m]);
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
          color: "#000000",
          fontSize: "20px",
          fontWeight: "bold",
          className: "marker-label",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 32,
          fillColor: "#1d4ed8",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 5,
        },
        animation: google.maps.Animation.DROP,
        optimized: false,
        zIndex: 100,
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
      
      // Fit bounds to show both markers
      if (mapRef.current && markersRef.current.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        markersRef.current.forEach(marker => {
          const pos = marker.getPosition();
          if (pos) bounds.extend(pos);
        });
        mapRef.current.fitBounds(bounds);
      }

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
          fontSize: "24px",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 30,
          fillColor: "#b91c1c",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 5,
        },
        animation: google.maps.Animation.DROP,
        optimized: false,
        zIndex: 99,
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
      if (mapRef.current && markersRef.current.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        markersRef.current.forEach(marker => {
          const pos = marker.getPosition();
          if (pos) bounds.extend(pos);
        });
        const padding = 50;
        mapRef.current.fitBounds(bounds, padding);
      }

      // Fit bounds to show both markers
      if (mapRef.current && markersRef.current.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        markersRef.current.forEach(marker => {
          const pos = marker.getPosition();
          console.log('[OrderMapModal] Marker position:', pos?.toJSON());
          if (pos) bounds.extend(pos);
        });
        console.log('[OrderMapModal] Bounds:', bounds.toJSON());
        mapRef.current.fitBounds(bounds);
        console.log('[OrderMapModal] Map bounds fitted to markers');
      } else {
        console.warn('[OrderMapModal] Cannot fit bounds:', {
          hasMap: !!mapRef.current,
          markerCount: markersRef.current.length,
        });
      }
    } catch (error) {
      console.error('[OrderMapModal] Error displaying markers on map:', error);
    }
  }, [geocodedLocation, mapReady, order.id]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'on the way':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      {/* Desktop: Grid layout (2 cols: map + sidebar) | Mobile: Scrollable flex */}
      <DialogContent className="w-[95vw] max-w-6xl h-[95vh] md:h-[85vh] md:w-auto flex flex-col md:grid md:grid-cols-3 md:gap-0 p-0">
        {/* Header - Full width */}
        <DialogHeader className="col-span-3 px-3 md:px-6 pt-3 md:pt-4 pb-2 flex-shrink-0 md:flex-shrink">
          <DialogTitle className="text-base md:text-lg">Order #{order.id} - Map View</DialogTitle>
        </DialogHeader>

        {/* Map Section - Full width on mobile, 2 columns on desktop */}
        <div className="col-span-3 md:col-span-2 flex flex-col gap-2 min-h-[300px] md:min-h-0 bg-gray-100 rounded-lg overflow-hidden relative md:rounded-none md:rounded-l-lg">
          {isGeocoding && (
            <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 flex items-center justify-center gap-2 p-2 md:p-3 bg-blue-50 rounded-lg shadow-md text-xs md:text-sm">
              <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
              <span className="text-blue-700">Locating address...</span>
            </div>
          )}

          {geocodeError && (
            <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 flex items-center gap-2 p-2 md:p-3 bg-red-50 rounded-lg shadow-md text-xs md:text-sm">
              <AlertCircle className="w-3 h-3 md:w-4 md:h-4 text-red-600" />
              <span className="text-red-700">{geocodeError}</span>
            </div>
          )}

          <MapView
            className="w-full h-full"
            initialCenter={RESTAURANT_LOCATION}
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

        {/* Order Details Sidebar - Below map on mobile, right side on desktop */}
        <div className="col-span-3 md:col-span-1 flex flex-col gap-2 md:gap-3 overflow-y-auto px-2 md:px-4 pb-3 md:pb-6 md:border-l md:border-gray-200 md:max-h-[calc(85vh-60px)]">
          {/* Status Card */}
          <Card className="p-2 md:p-3 flex-shrink-0">
            <h3 className="font-semibold text-xs md:text-sm text-gray-600 mb-2">Status</h3>
            <Badge className={`${getStatusColor(order.status)} w-full justify-center`}>
              {order.status}
            </Badge>
          </Card>

          {/* Customer Info Card */}
          <Card className="p-2 md:p-3 flex-shrink-0">
            <h3 className="font-semibold text-xs md:text-sm text-gray-600 mb-2">Customer Info</h3>
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
            <Card className="p-2 md:p-3 bg-green-50 border-green-200 flex-shrink-0">
              <h3 className="font-semibold text-xs md:text-sm text-gray-600 mb-2">Total</h3>
              <div className="text-lg font-bold text-green-700">${order.totalPrice.toFixed(2)}</div>
            </Card>
          )}

          {/* Items Card */}
          {order.items && order.items.length > 0 && (
            <Card className="p-2 md:p-3 flex-shrink-0">
              <h3 className="font-semibold text-xs md:text-sm text-gray-600 mb-2">Items</h3>
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
            <Card className="p-2 md:p-3 flex-shrink-0">
              <h3 className="font-semibold text-xs md:text-sm text-gray-600 mb-2">Notes</h3>
              <p className="text-xs text-gray-700">{order.notes}</p>
            </Card>
          )}

          {/* Close Button - Sticky at bottom */}
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full flex-shrink-0 mt-auto"
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
