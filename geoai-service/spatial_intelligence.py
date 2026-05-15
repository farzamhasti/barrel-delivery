"""
Spatial Intelligence Layer
PostGIS-based geospatial analysis for demand hotspots and zone segmentation

Features:
- Geographic clustering (DBSCAN/HDBSCAN)
- Heatmap generation
- Zone segmentation and analysis
- Spatial indexing and queries
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import logging
from datetime import datetime

try:
    from sklearn.cluster import DBSCAN
    from sklearn.preprocessing import StandardScaler
    import geopandas as gpd
    from shapely.geometry import Point, Polygon
    from shapely.ops import unary_union
except ImportError:
    pass

logger = logging.getLogger(__name__)


class ZoneType(str, Enum):
    """Zone classification types"""
    HIGH_DEMAND = "high_demand"
    MEDIUM_DEMAND = "medium_demand"
    LOW_DEMAND = "low_demand"
    EMERGING = "emerging"
    DECLINING = "declining"


@dataclass
class Hotspot:
    """Represents a demand hotspot"""
    cluster_id: int
    center_latitude: float
    center_longitude: float
    radius_km: float
    order_count: int
    total_demand: float
    average_demand: float
    demand_intensity: float  # 0-1
    zone_type: ZoneType
    timestamp: datetime
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'cluster_id': self.cluster_id,
            'center_latitude': self.center_latitude,
            'center_longitude': self.center_longitude,
            'radius_km': self.radius_km,
            'order_count': self.order_count,
            'total_demand': self.total_demand,
            'average_demand': self.average_demand,
            'demand_intensity': self.demand_intensity,
            'zone_type': self.zone_type.value,
            'timestamp': self.timestamp.isoformat(),
        }


@dataclass
class Zone:
    """Represents a delivery zone"""
    zone_id: str
    name: str
    boundary: Polygon
    center_latitude: float
    center_longitude: float
    area_km2: float
    zone_type: ZoneType
    demand_score: float  # 0-100
    order_count: int
    average_delivery_time: float


class SpatialAnalyzer:
    """Analyzes spatial patterns in delivery data"""
    
    def __init__(self, fort_erie_boundary: Optional[Polygon] = None):
        """
        Initialize spatial analyzer
        
        Args:
            fort_erie_boundary: Polygon defining Fort Erie delivery area
        """
        self.fort_erie_boundary = fort_erie_boundary or self._create_default_boundary()
        self.hotspots: List[Hotspot] = []
        self.zones: Dict[str, Zone] = {}
        self.scaler = StandardScaler()
    
    def _create_default_boundary(self) -> Polygon:
        """Create default Fort Erie boundary polygon"""
        # Fort Erie approximate boundary coordinates
        # This is a simplified boundary - in production, use actual GeoJSON
        coords = [
            (43.0, -79.0),
            (43.1, -79.0),
            (43.1, -79.1),
            (43.0, -79.1),
            (43.0, -79.0),
        ]
        return Polygon(coords)
    
    def detect_hotspots(
        self,
        orders: List[Dict],
        eps_km: float = 0.5,
        min_samples: int = 3,
        max_distance_km: float = 0.3
    ) -> List[Hotspot]:
        """
        Detect demand hotspots using DBSCAN clustering
        
        Args:
            orders: List of orders with latitude, longitude, demand
            eps_km: Clustering radius in kilometers
            min_samples: Minimum samples per cluster
            max_distance_km: Maximum distance to calculate radius
        
        Returns:
            List of detected hotspots
        """
        if not orders:
            return []
        
        try:
            # Extract coordinates and demand
            coordinates = np.array([
                [order['latitude'], order['longitude']]
                for order in orders
            ])
            
            demands = np.array([
                order.get('demand', 1.0)
                for order in orders
            ])
            
            # Convert km to degrees (approximate)
            eps_degrees = eps_km / 111.0
            
            # Apply DBSCAN clustering
            clustering = DBSCAN(eps=eps_degrees, min_samples=min_samples).fit(coordinates)
            labels = clustering.labels_
            
            # Process clusters
            self.hotspots = []
            unique_labels = set(labels)
            
            for label in unique_labels:
                if label == -1:  # Skip noise points
                    continue
                
                cluster_mask = labels == label
                cluster_coords = coordinates[cluster_mask]
                cluster_demands = demands[cluster_mask]
                
                # Calculate cluster statistics
                center_lat = np.mean(cluster_coords[:, 0])
                center_lon = np.mean(cluster_coords[:, 1])
                
                # Calculate radius (max distance from center)
                distances = np.sqrt(
                    (cluster_coords[:, 0] - center_lat) ** 2 +
                    (cluster_coords[:, 1] - center_lon) ** 2
                ) * 111.0  # Convert to km
                
                radius_km = np.max(distances) if len(distances) > 0 else max_distance_km
                
                # Calculate demand metrics
                total_demand = np.sum(cluster_demands)
                average_demand = np.mean(cluster_demands)
                order_count = len(cluster_demands)
                
                # Normalize demand intensity (0-1)
                max_possible_demand = 100 * order_count
                demand_intensity = min(1.0, total_demand / max_possible_demand)
                
                # Classify zone type
                if demand_intensity > 0.7:
                    zone_type = ZoneType.HIGH_DEMAND
                elif demand_intensity > 0.4:
                    zone_type = ZoneType.MEDIUM_DEMAND
                else:
                    zone_type = ZoneType.LOW_DEMAND
                
                hotspot = Hotspot(
                    cluster_id=int(label),
                    center_latitude=float(center_lat),
                    center_longitude=float(center_lon),
                    radius_km=float(radius_km),
                    order_count=int(order_count),
                    total_demand=float(total_demand),
                    average_demand=float(average_demand),
                    demand_intensity=float(demand_intensity),
                    zone_type=zone_type,
                    timestamp=datetime.utcnow()
                )
                
                self.hotspots.append(hotspot)
            
            logger.info(f"Detected {len(self.hotspots)} hotspots")
            return self.hotspots
        
        except Exception as e:
            logger.error(f"Hotspot detection error: {e}")
            return []
    
    def generate_heatmap_grid(
        self,
        orders: List[Dict],
        grid_size: int = 10
    ) -> np.ndarray:
        """
        Generate heatmap grid for visualization
        
        Args:
            orders: List of orders with latitude, longitude, demand
            grid_size: Number of grid cells per dimension
        
        Returns:
            2D numpy array with demand intensity values
        """
        if not orders:
            return np.zeros((grid_size, grid_size))
        
        try:
            # Get boundary
            minx, miny, maxx, maxy = self.fort_erie_boundary.bounds
            
            # Create grid
            heatmap = np.zeros((grid_size, grid_size))
            
            # Place orders on grid
            for order in orders:
                lat = order['latitude']
                lon = order['longitude']
                demand = order.get('demand', 1.0)
                
                # Convert to grid coordinates
                x_idx = int((lon - minx) / (maxx - minx) * (grid_size - 1))
                y_idx = int((lat - miny) / (maxy - miny) * (grid_size - 1))
                
                # Clamp to grid bounds
                x_idx = max(0, min(grid_size - 1, x_idx))
                y_idx = max(0, min(grid_size - 1, y_idx))
                
                # Add demand to grid cell
                heatmap[y_idx, x_idx] += demand
            
            # Normalize heatmap (0-1)
            max_val = np.max(heatmap)
            if max_val > 0:
                heatmap = heatmap / max_val
            
            return heatmap
        
        except Exception as e:
            logger.error(f"Heatmap generation error: {e}")
            return np.zeros((grid_size, grid_size))
    
    def segment_zones(
        self,
        orders: List[Dict],
        num_zones: int = 5
    ) -> Dict[str, Zone]:
        """
        Segment delivery area into zones based on demand
        
        Args:
            orders: List of orders with latitude, longitude, demand
            num_zones: Number of zones to create
        
        Returns:
            Dictionary of zones by zone_id
        """
        if not orders:
            return {}
        
        try:
            # First detect hotspots
            self.detect_hotspots(orders)
            
            # Create zones from hotspots
            self.zones = {}
            
            for i, hotspot in enumerate(self.hotspots):
                zone_id = f"zone_{i}"
                
                # Create zone boundary (circle around hotspot)
                zone_boundary = Point(
                    hotspot.center_longitude,
                    hotspot.center_latitude
                ).buffer(hotspot.radius_km / 111.0)
                
                # Calculate zone area
                area_km2 = hotspot.radius_km ** 2 * np.pi
                
                zone = Zone(
                    zone_id=zone_id,
                    name=f"Zone {i+1}",
                    boundary=zone_boundary,
                    center_latitude=hotspot.center_latitude,
                    center_longitude=hotspot.center_longitude,
                    area_km2=float(area_km2),
                    zone_type=hotspot.zone_type,
                    demand_score=float(hotspot.demand_intensity * 100),
                    order_count=hotspot.order_count,
                    average_delivery_time=0.0  # Will be calculated from actual data
                )
                
                self.zones[zone_id] = zone
            
            logger.info(f"Created {len(self.zones)} zones")
            return self.zones
        
        except Exception as e:
            logger.error(f"Zone segmentation error: {e}")
            return {}
    
    def get_zone_for_location(
        self,
        latitude: float,
        longitude: float
    ) -> Optional[Zone]:
        """
        Get zone for a specific location
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
        
        Returns:
            Zone containing the location, or None
        """
        point = Point(longitude, latitude)
        
        for zone in self.zones.values():
            if zone.boundary.contains(point):
                return zone
        
        return None
    
    def calculate_zone_statistics(self) -> Dict:
        """Calculate statistics for all zones"""
        if not self.zones:
            return {}
        
        stats = {
            'total_zones': len(self.zones),
            'total_area_km2': sum(zone.area_km2 for zone in self.zones.values()),
            'total_orders': sum(zone.order_count for zone in self.zones.values()),
            'average_demand_score': np.mean([zone.demand_score for zone in self.zones.values()]),
            'zones_by_type': {}
        }
        
        # Count zones by type
        for zone in self.zones.values():
            zone_type = zone.zone_type.value
            if zone_type not in stats['zones_by_type']:
                stats['zones_by_type'][zone_type] = 0
            stats['zones_by_type'][zone_type] += 1
        
        return stats
    
    def get_hotspots_dict(self) -> List[Dict]:
        """Get all hotspots as dictionaries"""
        return [hotspot.to_dict() for hotspot in self.hotspots]
    
    def get_zones_dict(self) -> Dict[str, Dict]:
        """Get all zones as dictionaries"""
        zones_dict = {}
        for zone_id, zone in self.zones.items():
            zones_dict[zone_id] = {
                'zone_id': zone.zone_id,
                'name': zone.name,
                'center_latitude': zone.center_latitude,
                'center_longitude': zone.center_longitude,
                'area_km2': zone.area_km2,
                'zone_type': zone.zone_type.value,
                'demand_score': zone.demand_score,
                'order_count': zone.order_count,
                'average_delivery_time': zone.average_delivery_time,
            }
        return zones_dict


# Singleton instance
_spatial_analyzer = None


def get_spatial_analyzer() -> SpatialAnalyzer:
    """Get or create spatial analyzer instance"""
    global _spatial_analyzer
    if _spatial_analyzer is None:
        _spatial_analyzer = SpatialAnalyzer()
    return _spatial_analyzer
