/**
 * Competitor Layer Component
 * Displays competitor markers on the Growth Opportunities map
 */

import React, { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { trpc } from '@/lib/trpc';

interface Competitor {
  osmId: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  distance_from_restaurant_km?: number;
  address?: string;
  website?: string;
  phone?: string;
}

interface CompetitorLayerProps {
  map?: L.Map;
  visible?: boolean;
  onCompetitorsLoaded?: (competitors: Competitor[]) => void;
}

// Color mapping for competitor types
const COMPETITOR_COLORS: Record<string, string> = {
  restaurant: '#FF6B6B',
  fast_food: '#FFA500',
  cafe: '#8B4513',
  bar: '#4B0082',
  food_court: '#FF1493',
  pub: '#8B0000',
  bakery: '#FFD700',
  ice_cream: '#87CEEB',
  pizza: '#DC143C',
  other: '#808080',
};

// Icon for competitors
const createCompetitorIcon = (type: string) => {
  const color = COMPETITOR_COLORS[type] || COMPETITOR_COLORS.other;
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        color: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        🏪
      </div>
    `,
    className: 'competitor-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

export const CompetitorLayer: React.FC<CompetitorLayerProps> = ({
  map,
  visible = true,
  onCompetitorsLoaded,
}) => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch competitors from API
  const { data, isLoading: queryLoading, error: queryError } = trpc.analytics.fetchCompetitorsFromAPI.useQuery(
    {
      latitude: 42.90517,
      longitude: -78.92295,
      radiusKm: 2,
    },
    {
      enabled: visible,
    }
  );

  // Update loading and error states
  useEffect(() => {
    setIsLoading(queryLoading);
    if (queryError) {
      setError((queryError as any).message || 'Failed to fetch competitors');
    }
  }, [queryLoading, queryError]);

  // Handle successful data fetch
  useEffect(() => {
    if (data?.success && data.competitors) {
      setCompetitors(data.competitors);
      onCompetitorsLoaded?.(data.competitors);
    } else if (data && !data.success) {
      setError(data.error || 'Failed to fetch competitors');
    }
  }, [data, onCompetitorsLoaded]);



  // Add markers to map
  useEffect(() => {
    if (!map || !visible || competitors.length === 0) return;

    competitors.forEach((competitor) => {
      const marker = L.marker(
        [competitor.latitude, competitor.longitude],
        {
          icon: createCompetitorIcon(competitor.type),
        }
      ).addTo(map);

      const popupContent = `
        <div style="font-size: 12px;">
          <strong>${competitor.name}</strong><br/>
          Type: ${competitor.type}<br/>
          ${competitor.distance_from_restaurant_km ? `Distance: ${competitor.distance_from_restaurant_km.toFixed(2)} km<br/>` : ''}
          ${competitor.address ? `Address: ${competitor.address}<br/>` : ''}
          ${competitor.phone ? `Phone: ${competitor.phone}<br/>` : ''}
          ${competitor.website ? `<a href="${competitor.website}" target="_blank">Website</a>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
    });

    return () => {
      // Cleanup markers on unmount
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker && layer.getIcon()?.options.className === 'competitor-icon') {
          map.removeLayer(layer);
        }
      });
    };
  }, [map, competitors, visible]);

  return (
    <div style={{ fontSize: '12px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        Competitors ({competitors.length})
      </div>

      {isLoading && <div style={{ color: '#666' }}>Loading competitors...</div>}
      {error && <div style={{ color: '#d32f2f' }}>Error: {error}</div>}

      {competitors.length > 0 && (
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {competitors.slice(0, 10).map((competitor) => (
            <div
              key={competitor.osmId}
              style={{
                padding: '4px',
                marginBottom: '4px',
                backgroundColor: 'white',
                borderLeft: `4px solid ${COMPETITOR_COLORS[competitor.type] || '#808080'}`,
                borderRadius: '2px',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{competitor.name}</div>
              <div style={{ fontSize: '10px', color: '#666' }}>
                {competitor.type}
                {competitor.distance_from_restaurant_km && ` • ${competitor.distance_from_restaurant_km.toFixed(1)} km`}
              </div>
            </div>
          ))}
          {competitors.length > 10 && (
            <div style={{ fontSize: '10px', color: '#999', fontStyle: 'italic' }}>
              +{competitors.length - 10} more competitors
            </div>
          )}
        </div>
      )}

      {competitors.length === 0 && !isLoading && !error && (
        <div style={{ color: '#999' }}>No competitors found in this area</div>
      )}
    </div>
  );
};
