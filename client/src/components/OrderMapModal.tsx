import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Clock, AlertCircle, Loader2 } from "lucide-react";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";

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

const RESTAURANT_LOCATION = { lat: 42.8711, lng: -79.2477 };

export function OrderMapModal({ open, onOpenChange, order }: OrderMapModalProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const [geocodedLocation, setGeocodedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Use geocoding mutation to convert address to coordinates
  const geocodeMutation = (trpc as any).maps.geocode.useMutation({
    onSuccess: (result: any) => {
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
      setGeocodeError(error.message || "Failed to geocode address");
      setIsGeocoding(false);
    },
  });

  // Geocode address when modal opens or order changes
  useEffect(() => {
    if (!open) return;

    // Check if we already have coordinates from customer data
    if (
      order.customer?.latitude &&
      order.customer?.longitude
    ) {
      const lat = parseFloat(order.customer.latitude as any);
      const lng = parseFloat(order.customer.longitude as any);
      if (!isNaN(lat) && !isNaN(lng)) {
        setGeocodedLocation({ lat, lng });
        return;
      }
    }

    // Otherwise, geocode the address
    const address = order.customerAddress || order.customer?.address;
    if (address) {
      setIsGeocoding(true);
      geocodeMutation.mutate({ address });
    }
  }, [open, order.id, order.customerAddress, order.customer?.address]);

  // Update map markers when location changes
  useEffect(() => {
    if (!mapReady || !mapRef.current || !geocodedLocation) return;

    // Clear existing markers and info windows
    markersRef.current.forEach(marker => marker.setMap(null));
    infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
    markersRef.current = [];
    infoWindowsRef.current = [];

    try {
      // Create info window for customer location with detailed order information
      const customerInfoContent = document.createElement('div');
      customerInfoContent.style.cssText = 'font-family: Arial, sans-serif; width: 280px;';
      customerInfoContent.innerHTML = `
        <div style="padding: 12px;">
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #1f2937;">
            Order #${order.id}
          </div>
          <div style="font-size: 13px; margin-bottom: 6px;">
            <strong>Customer:</strong> ${order.customer?.name || 'N/A'}
          </div>
          <div style="font-size: 13px; margin-bottom: 6px;">
            <strong>Address:</strong> ${order.customerAddress || order.customer?.address || 'N/A'}
          </div>
          <div style="font-size: 13px; margin-bottom: 6px;">
            <strong>Area:</strong> ${order.area || 'N/A'}
          </div>
          <div style="font-size: 13px; margin-bottom: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <strong>Status:</strong> 
            <span style="display: inline-block; margin-left: 4px; padding: 4px 8px; background-color: #fbbf24; border-radius: 4px; font-weight: bold; color: #78350f;">
              ${order.status}
            </span>
          </div>
          ${order.notes ? `<div style="font-size: 12px; color: #6b7280; font-style: italic; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
            <strong>Notes:</strong> ${order.notes}
          </div>` : ''}
        </div>
      `;

      const customerInfoWindow = new google.maps.InfoWindow({
        content: customerInfoContent,
      });

      // Add customer location marker with larger, more visible styling
      const customerMarker = new google.maps.Marker({
        map: mapRef.current,
        position: geocodedLocation,
        title: `Order #${order.id} - ${order.customer?.name}`,
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

      // Add click listener to show info window
      customerMarker.addListener('click', () => {
        // Close all other info windows
        infoWindowsRef.current.forEach(iw => iw.close());
        customerInfoWindow.open(mapRef.current, customerMarker);
      });

      // Open info window by default
      customerInfoWindow.open(mapRef.current, customerMarker);
      infoWindowsRef.current.push(customerInfoWindow);
      markersRef.current.push(customerMarker);

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
      const restaurantMarker = new google.maps.Marker({
        map: mapRef.current,
        position: RESTAURANT_LOCATION,
        title: "Restaurant",
        label: {
          text: "🍽️",
          fontSize: "20px",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 18,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 3,
        },
        animation: google.maps.Animation.DROP,
      });

      // Add click listener to show info window
      restaurantMarker.addListener('click', () => {
        // Close all other info windows
        infoWindowsRef.current.forEach(iw => iw.close());
        restaurantInfoWindow.open(mapRef.current, restaurantMarker);
      });

      infoWindowsRef.current.push(restaurantInfoWindow);
      markersRef.current.push(restaurantMarker);

      // Center map between the two locations with padding
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(geocodedLocation);
      bounds.extend(RESTAURANT_LOCATION);
      mapRef.current.fitBounds(bounds, { top: 100, right: 100, bottom: 100, left: 100 });
    } catch (error) {
      console.error("Error creating markers:", error);
      setGeocodeError("Failed to display markers on map");
    }
  }, [mapReady, geocodedLocation, order.id, order.customer?.name, order.status, order.area, order.notes]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Ready":
        return "bg-blue-100 text-blue-800";
      case "On the Way":
        return "bg-purple-100 text-purple-800";
      case "Delivered":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return "⏱️";
      case "Ready":
        return "✅";
      case "On the Way":
        return "🚗";
      case "Delivered":
        return "🎉";
      default:
        return "📦";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-2 sm:p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Order #{order.id} - Map View</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden h-[300px] sm:h-[400px] lg:h-[500px]">
              {isGeocoding ? (
                <div className="flex items-center justify-center h-full bg-muted">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    <p className="text-sm text-muted-foreground">Loading map...</p>
                  </div>
                </div>
              ) : geocodeError ? (
                <div className="flex items-center justify-center h-full bg-destructive/10">
                  <div className="flex flex-col items-center gap-2 text-center px-4">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                    <p className="text-sm text-destructive font-medium">Map Error</p>
                    <p className="text-xs text-muted-foreground">{geocodeError}</p>
                  </div>
                </div>
              ) : (
                <MapView
                  initialCenter={geocodedLocation || RESTAURANT_LOCATION}
                  initialZoom={geocodedLocation ? 15 : 13}
                  onMapReady={(map) => {
                    mapRef.current = map;
                    setMapReady(true);
                  }}
                />
              )}
            </Card>
          </div>

          {/* Order Details Section */}
          <div className="space-y-4">
            {/* Status Card */}
            <Card className="p-4 bg-gradient-to-br from-accent/10 to-accent/5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{getStatusIcon(order.status)}</span>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Current Status</p>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Customer Info Card */}
            <Card className="p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Customer</p>
                <p className="font-semibold text-foreground">{order.customer?.name}</p>
              </div>

              {order.customer?.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <a
                      href={`tel:${order.customer.phone}`}
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      {order.customer.phone}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    {order.customerAddress || order.customer?.address}
                  </p>
                </div>
              </div>

              {order.area && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Area</p>
                  <Badge variant="outline">{order.area}</Badge>
                </div>
              )}
            </Card>

            {/* Order Summary Card */}
            <Card className="p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Items</p>
                <div className="space-y-1 text-sm">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-foreground">{item.quantity}x {item.menuItemName}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-foreground">Total</p>
                  <p className="text-lg font-bold text-accent">${typeof order.totalPrice === 'number' ? order.totalPrice.toFixed(2) : (parseFloat(String(order.totalPrice || 0))).toFixed(2)}</p>
                </div>
              </div>
            </Card>

            {order.notes && (
              <Card className="p-4 space-y-2 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <p className="text-xs text-muted-foreground font-medium mb-2">Special Instructions</p>
                <p className="text-sm text-foreground">{order.notes}</p>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  const address = order.customerAddress || order.customer?.address;
                  if (address) {
                    window.open(
                      `https://www.google.com/maps/search/${encodeURIComponent(address)}`,
                      "_blank"
                    );
                  }
                }}
              >
                Open in Maps
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
