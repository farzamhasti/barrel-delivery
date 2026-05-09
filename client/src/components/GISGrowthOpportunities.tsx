import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Order {
  id: number;
  customerLatitude: number;
  customerLongitude: number;
  deliveryTime?: number;
  customerAddress?: string;
  createdAt?: string;
}

interface Competitor {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
}

interface GISGrowthOpportunitiesProps {
  zones?: any[];
  gridCells?: Record<string, { orderCount: number; orders?: any[] }>;
  competitors?: Competitor[];
  showCompetitors?: boolean;
}

const RESTAURANT_LOCATION = { lat: 42.90517, lng: -78.92295 };

// Fort Erie competitors data - All 36 competitors from the data file
const FORT_ERIE_COMPETITORS: Competitor[] = [
  { id: 1172079406, name: "McDonald's", latitude: 42.9077128, longitude: -78.9190110, type: "fast_food" },
  { id: 1721210349, name: "Shake n' Dog", latitude: 42.8639661, longitude: -79.0683893, type: "restaurant" },
  { id: 2503413489, name: "Tim Hortons", latitude: 42.9076679, longitude: -78.9189208, type: "cafe" },
  { id: 5070173721, name: "335 on the Ridge", latitude: 42.8833677, longitude: -79.0524639, type: "restaurant" },
  { id: 6728537025, name: "Our Corner Cafe", latitude: 42.8859235, longitude: -79.0522642, type: "cafe" },
  { id: 7349691717, name: "Chuck's Roadhouse", latitude: 42.9048291, longitude: -78.9274862, type: "restaurant" },
  { id: 7349691731, name: "Pizza Pizza", latitude: 42.9047653, longitude: -78.9256173, type: "fast_food" },
  { id: 7349691783, name: "The Barrel", latitude: 42.9052194, longitude: -78.9232931, type: "restaurant" },
  { id: 7349692458, name: "Little Caesars", latitude: 42.9048874, longitude: -78.9308618, type: "fast_food" },
  { id: 7349692460, name: "M&J's", latitude: 42.9049739, longitude: -78.9301483, type: "fast_food" },
  { id: 7349731014, name: "Subway", latitude: 42.9058015, longitude: -78.9244808, type: "fast_food" },
  { id: 7349731015, name: "Pita Pit", latitude: 42.9058074, longitude: -78.9237995, type: "fast_food" },
  { id: 7349738505, name: "Yukiguni II", latitude: 42.9057459, longitude: -78.9396668, type: "restaurant" },
  { id: 7352994236, name: "Subway", latitude: 42.9501464, longitude: -79.0555546, type: "fast_food" },
  { id: 9989780584, name: "Shaggy's Pizza & Eats", latitude: 42.9445158, longitude: -79.0550848, type: "restaurant" },
  { id: 10172458516, name: "Mae's Place", latitude: 42.9448312, longitude: -79.0545588, type: "restaurant" },
  { id: 10278842509, name: "Bella Pizza", latitude: 42.8851377, longitude: -79.0579428, type: "fast_food" },
  { id: 10278852409, name: "Subway", latitude: 42.8850714, longitude: -79.0589701, type: "fast_food" },
  { id: 11979893866, name: "South Coast Cookhouse", latitude: 42.8638695, longitude: -79.0614649, type: "restaurant" },
  { id: 11992741406, name: "Amafli's Trattoria & Bar", latitude: 42.8639310, longitude: -79.0631738, type: "restaurant" },
  { id: 663169639, name: "McDonald's", latitude: 42.9060040, longitude: -78.9275090, type: "fast_food" },
  { id: 663169665, name: "Garrison Grill", latitude: 42.9051515, longitude: -78.9295640, type: "fast_food" },
  { id: 663171739, name: "Tim Hortons", latitude: 42.9044395, longitude: -78.9589475, type: "cafe" },
  { id: 663182520, name: "Tim Hortons", latitude: 42.9061340, longitude: -78.9182915, type: "cafe" },
  { id: 663182521, name: "Wendy's", latitude: 42.9060295, longitude: -78.9187955, type: "fast_food" },
  { id: 663182646, name: "Artemis", latitude: 42.9059780, longitude: -78.9210090, type: "restaurant" },
  { id: 663182691, name: "KFC", latitude: 42.9047770, longitude: -78.9253040, type: "fast_food" },
  { id: 663182734, name: "Vaticano Restaurant", latitude: 42.9110805, longitude: -78.9090575, type: "restaurant" },
  { id: 663182735, name: "Happy Jack's", latitude: 42.9113715, longitude: -78.9090245, type: "restaurant" },
  { id: 663182737, name: "Ming Teh", latitude: 42.9119595, longitude: -78.9089565, type: "restaurant" },
  { id: 663182827, name: "The Sicilian Chef", latitude: 42.9094398, longitude: -78.9145282, type: "restaurant" },
  { id: 663214348, name: "The Breakfast Beacon", latitude: 42.8644220, longitude: -79.0583545, type: "restaurant" },
  { id: 663299556, name: "The Scuttlebutt Tap & Eatery", latitude: 42.9455105, longitude: -79.0544950, type: "restaurant" },
  { id: 663299642, name: "Tim Hortons", latitude: 42.9506930, longitude: -79.0542615, type: "cafe" },
  { id: 1111892111, name: "Red's Takeout", latitude: 42.9460823, longitude: -79.0545900, type: "restaurant" },
  { id: 1469989685, name: "A&W", latitude: 42.9056188, longitude: -78.9380640, type: "fast_food" },
  { id: 9999999999, name: "Red Swan Pizza", latitude: 42.9056700, longitude: -78.9264499, type: "restaurant" },
  { id: 9999999998, name: "Crafted 1885", latitude: 42.8862884, longitude: -78.9633893, type: "restaurant" },
  { id: 9999999997, name: "Take 2 Restaurant & Bar", latitude: 42.9042302, longitude: -78.9848798, type: "restaurant" },
  { id: 9999999996, name: "Rizzo's House of Parm", latitude: 42.8747407, longitude: -79.0588556, type: "restaurant" },
  { id: 9999999995, name: "Rina's Place", latitude: 42.8863661, longitude: -78.9598362, type: "restaurant" },
  { id: 9999999994, name: "Tahini's", latitude: 42.9053193, longitude: -78.9330572, type: "restaurant" },
  { id: 9999999993, name: "Osmow's Shawarma", latitude: 42.9053193, longitude: -78.9330572, type: "fast_food" },
  { id: 9999999992, name: "The Plaice Bar & Grill", latitude: 42.9048928, longitude: -78.9514935, type: "restaurant" },
  { id: 9999999991, name: "Pizza Hut", latitude: 42.9057655, longitude: -78.9210877, type: "fast_food" },
  { id: 9999999990, name: "Arby's", latitude: 42.9057655, longitude: -78.9210877, type: "fast_food" },
  { id: 9999999989, name: "Little Red Coffee & Catering", latitude: 42.9093891, longitude: -78.9118284, type: "restaurant" },
  { id: 9999999988, name: "Southsides Patio Bar & Grill", latitude: 42.9107045, longitude: -78.9091060, type: "cafe" },
  { id: 9999999987, name: "City Thai Restaurant", latitude: 42.9108257, longitude: -78.9095244, type: "restaurant" },
];

// Haversine distance calculation
const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export function GISGrowthOpportunities({
  zones = [],
  gridCells = {},
  competitors: propCompetitors = [],
  showCompetitors = true,
}: GISGrowthOpportunitiesProps) {
  const competitors = FORT_ERIE_COMPETITORS;
  const [radiusKm, setRadiusKm] = useState(1);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(['restaurant', 'cafe', 'fast_food']));
  const [selectedCompetitors, setSelectedCompetitors] = useState<Set<number>>(new Set());
  const [showCompetitorList, setShowCompetitorList] = useState(false);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const circlesRef = useRef<L.Circle[]>([]);

  const toggleCompetitorType = (type: string) => {
    const newTypes = new Set(visibleTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setVisibleTypes(newTypes);
  };

  const toggleCompetitorSelection = (competitorId: number) => {
    const newSelected = new Set(selectedCompetitors);
    if (newSelected.has(competitorId)) {
      newSelected.delete(competitorId);
    } else {
      newSelected.add(competitorId);
    }
    setSelectedCompetitors(newSelected);
  };

  const clearCompetitorSelection = () => {
    setSelectedCompetitors(new Set());
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current).setView(
      [RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng],
      12
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map.current);

    L.control.scale().addTo(map.current);

    // Add restaurant marker
    const restaurantIcon = L.divIcon({
      className: "restaurant-marker",
      html: `<div style="background-color: #2563eb; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🍽️</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const restaurantMarker = L.marker([RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng], {
      icon: restaurantIcon,
      title: "The Barrel - Our Restaurant",
    }).addTo(map.current);
    
    restaurantMarker.bindPopup(
      '<strong>The Barrel - Our Restaurant</strong>',
      { autoClose: false, closeButton: true }
    );

    restaurantMarker.on('click', function() {
      this.openPopup();
    });

    return () => {
      // Cleanup handled in second useEffect
    };
  }, []);

  // Update markers when data or settings change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      try {
        map.current!.removeLayer(marker);
      } catch (e) {}
    });
    circlesRef.current.forEach((circle) => {
      try {
        map.current!.removeLayer(circle);
      } catch (e) {}
    });
    markersRef.current = [];
    circlesRef.current = [];

    // Collect all orders
    const allOrders: Order[] = [];
    Object.values(gridCells).forEach((cell: any) => {
      if (cell.orders && Array.isArray(cell.orders)) {
        allOrders.push(...cell.orders);
      }
    });

    // Add order markers
    allOrders.forEach((order: any) => {
      const lat = parseFloat(order.customerLatitude || 0);
      const lng = parseFloat(order.customerLongitude || 0);
      const deliveryTime = parseInt(order.deliveryTime || 0);

      if (!lat || !lng) return;

      const marker = L.circleMarker([lat, lng], {
        radius: 5,
        fillColor: "#10b981",
        color: "white",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.7,
      }).addTo(map.current!);

      const popupText = `<strong>Order #${order.id || "N/A"}</strong><br/>
        Delivery Time: ${deliveryTime} min<br/>
        Address: ${order.customerAddress || "N/A"}<br/>
        Date: ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A"}`;

      marker.bindPopup(popupText, { autoClose: false, closeButton: true });
      marker.on('click', function() {
        this.openPopup();
      });

      markersRef.current.push(marker);
    });

    // Add competitor markers
    const competitorColors: Record<string, string> = {
      restaurant: "#FF6B6B",
      fast_food: "#FFA500",
      cafe: "#8B4513",
      bar: "#4B0082",
      food_court: "#FF1493",
      pub: "#8B0000",
      bakery: "#FFD700",
      ice_cream: "#87CEEB",
      pizza: "#DC143C",
      other: "#808080",
    };

    competitors.forEach((competitor: Competitor) => {
      // Only show if type is visible
      if (!visibleTypes.has(competitor.type)) {
        return;
      }

      // If specific competitors are selected, only show those
      if (selectedCompetitors.size > 0 && !selectedCompetitors.has(competitor.id)) {
        return;
      }

      const color = competitorColors[competitor.type] || competitorColors.other;
      
      const marker = L.circleMarker([competitor.latitude, competitor.longitude], {
        radius: 8,
        fillColor: color,
        color: "white",
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.85,
      }).addTo(map.current!);

      // Bind popup with competitor name
      marker.bindPopup(
        `<strong>${competitor.name}</strong><br/>Type: ${competitor.type}`,
        { autoClose: false, closeButton: true }
      );

      // Open popup on click
      marker.on('click', function() {
        this.openPopup();
      });

      markersRef.current.push(marker);

      // Add radius circle
      const circle = L.circle([competitor.latitude, competitor.longitude], {
        radius: radiusKm * 1000,
        color: color,
        weight: 1,
        opacity: 0.2,
        fillColor: color,
        fillOpacity: 0.05,
      }).addTo(map.current!);

      circlesRef.current.push(circle);
    });
  }, [gridCells, radiusKm, visibleTypes, selectedCompetitors]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Geographical Analysis of Competitors - GIS Map</h3>
      </div>

      {/* Control Panel */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="radius-slider" className="text-sm font-medium">
            Competitor Radius: {radiusKm.toFixed(1)} km
          </Label>
          <Slider
            id="radius-slider"
            min={0.5}
            max={5}
            step={0.1}
            value={[radiusKm]}
            onValueChange={(value) => setRadiusKm(value[0])}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Show Competitors:</Label>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => toggleCompetitorType('restaurant')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                visibleTypes.has('restaurant')
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🍽️ Restaurants
            </button>
            <button
              onClick={() => toggleCompetitorType('cafe')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                visibleTypes.has('cafe')
                  ? 'bg-yellow-700 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ☕ Cafes
            </button>
            <button
              onClick={() => toggleCompetitorType('fast_food')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                visibleTypes.has('fast_food')
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🍔 Fast Food
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => setShowCompetitorList(!showCompetitorList)}
            className="w-full px-3 py-2 rounded text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            {showCompetitorList ? '✕ Hide' : '+ Show'} Competitor Names
          </button>
          {showCompetitorList && (
            <div className="bg-white border border-gray-300 rounded p-3 max-h-48 overflow-y-auto space-y-2">
              <button
                onClick={clearCompetitorSelection}
                className="w-full px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Clear Selection
              </button>
              <div className="space-y-1">
                {competitors.map((competitor) => (
                  <label key={competitor.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedCompetitors.has(competitor.id)}
                      onChange={() => toggleCompetitorSelection(competitor.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-xs text-gray-700 flex-1">
                      {competitor.name}
                      <span className="text-gray-500 ml-1">({competitor.type})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div
        ref={mapContainer}
        className="rounded-lg border border-gray-200 overflow-hidden"
        style={{ height: "500px" }}
      />

      {/* Legend */}
      <div className="bg-blue-50 p-3 rounded border border-blue-200">
        <div className="font-semibold text-blue-900 mb-2">Competitors (Fort Erie)</div>
        <div className="text-blue-700 space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FF6B6B" }}></div>
            <span>Restaurants</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#8B4513" }}></div>
            <span>Cafes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FFA500" }}></div>
            <span>Fast Food</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#10b981" }}></div>
            <span>Orders</span>
          </div>
        </div>
      </div>
    </div>
  );
}
