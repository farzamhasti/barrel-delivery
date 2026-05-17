/**
 * PostGIS Integration
 * Geospatial database integration for efficient spatial querying
 */

import { logger } from '../utils/logger';

interface SpatialIndex {
  tableName: string;
  geometryColumn: string;
  indexType: 'gist' | 'brin' | 'hash';
  indexed: boolean;
}

interface SpatialQuery {
  type: 'contains' | 'within' | 'intersects' | 'distance' | 'nearest';
  geometry: any;
  distance?: number;
  limit?: number;
}

/**
 * PostGIS Integration Manager
 * Handles geospatial data storage and querying
 */
export class PostGISIntegration {
  private spatialIndexes: Map<string, SpatialIndex> = new Map();
  private fortEriePolygon = {
    type: 'Polygon',
    coordinates: [
      [
        [-79.3, 42.88],
        [-79.0, 42.88],
        [-79.0, 43.15],
        [-79.3, 43.15],
        [-79.3, 42.88],
      ],
    ],
  };

  constructor() {
    this.initializeSpatialIndexes();
  }

  /**
   * Initialize spatial indexes for main tables
   */
  private initializeSpatialIndexes(): void {
    const indexes = [
      { tableName: 'orders', geometryColumn: 'delivery_location', indexType: 'gist' as const },
      { tableName: 'drivers', geometryColumn: 'current_location', indexType: 'gist' as const },
      { tableName: 'zones', geometryColumn: 'boundary', indexType: 'gist' as const },
      { tableName: 'hotspots', geometryColumn: 'center', indexType: 'gist' as const },
      { tableName: 'delivery_corridors', geometryColumn: 'route', indexType: 'brin' as const },
    ];

    for (const index of indexes) {
      this.spatialIndexes.set(index.tableName, {
        ...index,
        indexed: true,
      });
    }

    logger.info(`Initialized ${indexes.length} spatial indexes`);
  }

  /**
   * SQL for creating spatial index on orders table
   */
  getOrdersTableSQL(): string {
    return `
      CREATE TABLE IF NOT EXISTS orders_spatial (
        id VARCHAR(36) PRIMARY KEY,
        restaurant_id VARCHAR(36) NOT NULL,
        delivery_location GEOMETRY(POINT, 4326) NOT NULL,
        pickup_location GEOMETRY(POINT, 4326),
        created_at BIGINT NOT NULL,
        completed_at BIGINT,
        delivery_time INT,
        status VARCHAR(50),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
      );

      CREATE INDEX IF NOT EXISTS idx_orders_delivery_location 
        ON orders_spatial USING GIST (delivery_location);
      
      CREATE INDEX IF NOT EXISTS idx_orders_created_at 
        ON orders_spatial (created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_orders_status 
        ON orders_spatial (status);
    `;
  }

  /**
   * SQL for creating spatial index on drivers table
   */
  getDriversTableSQL(): string {
    return `
      CREATE TABLE IF NOT EXISTS drivers_spatial (
        id VARCHAR(36) PRIMARY KEY,
        restaurant_id VARCHAR(36) NOT NULL,
        current_location GEOMETRY(POINT, 4326),
        status VARCHAR(50),
        active_orders INT DEFAULT 0,
        last_updated BIGINT,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
      );

      CREATE INDEX IF NOT EXISTS idx_drivers_location 
        ON drivers_spatial USING GIST (current_location);
      
      CREATE INDEX IF NOT EXISTS idx_drivers_status 
        ON drivers_spatial (status);
    `;
  }

  /**
   * SQL for creating zones table
   */
  getZonesTableSQL(): string {
    return `
      CREATE TABLE IF NOT EXISTS delivery_zones (
        id VARCHAR(36) PRIMARY KEY,
        restaurant_id VARCHAR(36) NOT NULL,
        zone_name VARCHAR(255),
        boundary GEOMETRY(POLYGON, 4326),
        center GEOMETRY(POINT, 4326),
        created_at BIGINT,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
      );

      CREATE INDEX IF NOT EXISTS idx_zones_boundary 
        ON delivery_zones USING GIST (boundary);
      
      CREATE INDEX IF NOT EXISTS idx_zones_center 
        ON delivery_zones USING GIST (center);
    `;
  }

  /**
   * SQL for creating hotspots table
   */
  getHotspotsTableSQL(): string {
    return `
      CREATE TABLE IF NOT EXISTS demand_hotspots (
        id VARCHAR(36) PRIMARY KEY,
        restaurant_id VARCHAR(36) NOT NULL,
        center GEOMETRY(POINT, 4326),
        radius DECIMAL(10, 4),
        intensity DECIMAL(5, 2),
        demand_level VARCHAR(20),
        surge BOOLEAN DEFAULT FALSE,
        created_at BIGINT,
        updated_at BIGINT,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
      );

      CREATE INDEX IF NOT EXISTS idx_hotspots_center 
        ON demand_hotspots USING GIST (center);
      
      CREATE INDEX IF NOT EXISTS idx_hotspots_intensity 
        ON demand_hotspots (intensity DESC);
    `;
  }

  /**
   * SQL for creating delivery corridors table
   */
  getCorridorsTableSQL(): string {
    return `
      CREATE TABLE IF NOT EXISTS delivery_corridors (
        id VARCHAR(36) PRIMARY KEY,
        restaurant_id VARCHAR(36) NOT NULL,
        start_zone VARCHAR(36),
        end_zone VARCHAR(36),
        route GEOMETRY(LINESTRING, 4326),
        expected_orders INT,
        estimated_time INT,
        congestion_level VARCHAR(20),
        created_at BIGINT,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
      );

      CREATE INDEX IF NOT EXISTS idx_corridors_route 
        ON delivery_corridors USING BRIN (route);
      
      CREATE INDEX IF NOT EXISTS idx_corridors_congestion 
        ON delivery_corridors (congestion_level);
    `;
  }

  /**
   * Query: Find orders within distance of a point
   */
  getOrdersWithinDistanceSQL(lat: number, lng: number, distanceKm: number): string {
    return `
      SELECT 
        id, 
        delivery_location,
        ST_Distance(delivery_location, ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)) / 1000 as distance_km,
        created_at,
        status
      FROM orders_spatial
      WHERE ST_DWithin(
        delivery_location, 
        ST_SetSRID(ST_Point(${lng}, ${lat}), 4326), 
        ${distanceKm * 1000}
      )
      ORDER BY distance_km ASC;
    `;
  }

  /**
   * Query: Find drivers within zone
   */
  getDriversInZoneSQL(zoneId: string): string {
    return `
      SELECT 
        d.id,
        d.current_location,
        d.status,
        d.active_orders,
        ST_Distance(d.current_location, z.center) / 1000 as distance_from_center
      FROM drivers_spatial d
      JOIN delivery_zones z ON z.id = '${zoneId}'
      WHERE ST_Contains(z.boundary, d.current_location)
      ORDER BY d.status, d.active_orders ASC;
    `;
  }

  /**
   * Query: Find nearest drivers to location
   */
  getNearestDriversSQL(lat: number, lng: number, limit: number = 5): string {
    return `
      SELECT 
        id,
        current_location,
        status,
        active_orders,
        ST_Distance(current_location, ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)) / 1000 as distance_km
      FROM drivers_spatial
      WHERE status = 'available'
      ORDER BY distance_km ASC
      LIMIT ${limit};
    `;
  }

  /**
   * Query: Find hotspots in area
   */
  getHotspotsInAreaSQL(minLat: number, minLng: number, maxLat: number, maxLng: number): string {
    return `
      SELECT 
        id,
        center,
        radius,
        intensity,
        demand_level,
        surge
      FROM demand_hotspots
      WHERE ST_Intersects(
        center,
        ST_SetSRID(
          ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}),
          4326
        )
      )
      ORDER BY intensity DESC;
    `;
  }

  /**
   * Query: Find orders in polygon (zone)
   */
  getOrdersInZoneSQL(zoneId: string, hoursBack: number = 24): string {
    const timestamp = Date.now() - hoursBack * 3600000;
    return `
      SELECT 
        o.id,
        o.delivery_location,
        o.created_at,
        o.delivery_time,
        o.status
      FROM orders_spatial o
      JOIN delivery_zones z ON z.id = '${zoneId}'
      WHERE ST_Contains(z.boundary, o.delivery_location)
        AND o.created_at >= ${timestamp}
      ORDER BY o.created_at DESC;
    `;
  }

  /**
   * Query: Calculate zone statistics
   */
  getZoneStatisticsSQL(zoneId: string, hoursBack: number = 24): string {
    const timestamp = Date.now() - hoursBack * 3600000;
    return `
      SELECT 
        COUNT(*) as total_orders,
        AVG(o.delivery_time) as avg_delivery_time,
        MAX(o.delivery_time) as max_delivery_time,
        MIN(o.delivery_time) as min_delivery_time,
        COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_orders
      FROM orders_spatial o
      JOIN delivery_zones z ON z.id = '${zoneId}'
      WHERE ST_Contains(z.boundary, o.delivery_location)
        AND o.created_at >= ${timestamp};
    `;
  }

  /**
   * Query: Find delivery corridors by congestion
   */
  getCorridorsByCongestionSQL(congestionLevel: string): string {
    return `
      SELECT 
        id,
        start_zone,
        end_zone,
        route,
        expected_orders,
        estimated_time,
        congestion_level
      FROM delivery_corridors
      WHERE congestion_level = '${congestionLevel}'
      ORDER BY expected_orders DESC;
    `;
  }

  /**
   * Query: Calculate driver density in area
   */
  getDriverDensitySQL(lat: number, lng: number, radiusKm: number): string {
    return `
      SELECT 
        COUNT(*) as driver_count,
        AVG(active_orders) as avg_active_orders,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_drivers
      FROM drivers_spatial
      WHERE ST_DWithin(
        current_location,
        ST_SetSRID(ST_Point(${lng}, ${lat}), 4326),
        ${radiusKm * 1000}
      );
    `;
  }

  /**
   * Query: Find overlapping hotspots
   */
  getOverlappingHotspotsSQL(hotspotId: string): string {
    return `
      SELECT 
        h2.id,
        h2.center,
        h2.intensity,
        ST_Distance(h1.center, h2.center) / 1000 as distance_km
      FROM demand_hotspots h1
      JOIN demand_hotspots h2 ON h1.id != h2.id
      WHERE h1.id = '${hotspotId}'
        AND ST_DWithin(h1.center, h2.center, 2000)
      ORDER BY distance_km ASC;
    `;
  }

  /**
   * Get spatial index status
   */
  getSpatialIndexStatus(): Map<string, SpatialIndex> {
    return this.spatialIndexes;
  }

  /**
   * Generate migration SQL for all spatial tables
   */
  generateMigrationSQL(): string {
    return `
      -- Enable PostGIS extension
      CREATE EXTENSION IF NOT EXISTS postgis;

      -- Create spatial tables
      ${this.getOrdersTableSQL()}

      ${this.getDriversTableSQL()}

      ${this.getZonesTableSQL()}

      ${this.getHotspotsTableSQL()}

      ${this.getCorridorsTableSQL()}

      -- Create function for point in polygon queries
      CREATE OR REPLACE FUNCTION get_orders_in_zone(
        p_zone_id VARCHAR,
        p_hours_back INT DEFAULT 24
      ) RETURNS TABLE (
        order_id VARCHAR,
        lat DECIMAL,
        lng DECIMAL,
        delivery_time INT,
        status VARCHAR
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          o.id,
          ST_Y(o.delivery_location)::DECIMAL,
          ST_X(o.delivery_location)::DECIMAL,
          o.delivery_time,
          o.status
        FROM orders_spatial o
        JOIN delivery_zones z ON z.id = p_zone_id
        WHERE ST_Contains(z.boundary, o.delivery_location)
          AND o.created_at >= (EXTRACT(EPOCH FROM NOW()) - p_hours_back * 3600) * 1000;
      END;
      $$ LANGUAGE plpgsql;

      -- Create function for nearest drivers
      CREATE OR REPLACE FUNCTION get_nearest_drivers(
        p_lat DECIMAL,
        p_lng DECIMAL,
        p_limit INT DEFAULT 5
      ) RETURNS TABLE (
        driver_id VARCHAR,
        distance_km DECIMAL,
        status VARCHAR,
        active_orders INT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          d.id,
          (ST_Distance(d.current_location, ST_SetSRID(ST_Point(p_lng, p_lat), 4326)) / 1000)::DECIMAL,
          d.status,
          d.active_orders
        FROM drivers_spatial d
        WHERE d.status = 'available'
        ORDER BY ST_Distance(d.current_location, ST_SetSRID(ST_Point(p_lng, p_lat), 4326))
        LIMIT p_limit;
      END;
      $$ LANGUAGE plpgsql;
    `;
  }
}

// Export singleton instance
export const postgisIntegration = new PostGISIntegration();
