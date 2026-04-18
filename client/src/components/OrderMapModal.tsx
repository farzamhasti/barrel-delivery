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
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [geocodedLocation, setGeocodedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

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
    if (!mapRef.current || !geocodedLocation) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add customer location marker
    const customerMarker = new google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current,
      position: geocodedLocation,
      title: `Order #${order.id} - ${order.customer?.name}`,
      content: createOrderMarker(order),
    });
    markersRef.current.push(customerMarker);

    // Add restaurant marker
    const restaurantMarker = new google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current,
      position: RESTAURANT_LOCATION,
      title: "Restaurant",
      content: createRestaurantMarker(),
    });
    markersRef.current.push(restaurantMarker);

    // Center map between the two locations
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(geocodedLocation);
    bounds.extend(RESTAURANT_LOCATION);
    mapRef.current.fitBounds(bounds);
  }, [geocodedLocation, order.id]);

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order #{order.id} - Map View</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden h-[400px] lg:h-[500px]">
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
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-foreground">{item.quantity}x</span>
                        <span className="text-muted-foreground line-clamp-1 flex-1 ml-2">
                          {item.menuItemName}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-xs">No items</p>
                  )}
                </div>
              </div>

              {order.totalPrice !== undefined && (
                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Total</span>
                    <span className="text-lg font-bold text-accent">
                      ${(Number(order.totalPrice) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Notes Card */}
            {order.notes && (
              <Card className="p-4 bg-muted/50">
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

function createOrderMarker(order: any) {
  const div = document.createElement("div");
  div.className = "flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-full font-bold text-sm shadow-lg";
  div.innerHTML = `#${order.id}`;
  return div;
}

function createRestaurantMarker() {
  const div = document.createElement("div");
  div.className = "flex items-center justify-center w-12 h-12 bg-red-500 text-white rounded-full font-bold text-lg shadow-lg";
  div.innerHTML = "🍽️";
  return div;
}
