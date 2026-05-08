import { getDb } from './db';
import { orders, geocodedAddresses, drivers } from '../drizzle/schema';
import { eq, and, gte, lte, isNotNull } from 'drizzle-orm';
import { ENV } from './_core/env';

// Haversine formula to calculate distance between two coordinates in meters
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Geocode address using Google Maps API and cache result
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check cache first
    const cached = await db.select().from(geocodedAddresses).where(eq(geocodedAddresses.address, address));
    if (cached.length > 0) {
      return {
        lat: parseFloat(cached[0].latitude.toString()),
        lng: parseFloat(cached[0].longitude.toString()),
      };
    }

    // Call Google Maps Geocoding API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${ENV.googleMapsApiKey}`
    );
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      
      // Cache the result
      await db.insert(geocodedAddresses).values({
        address,
        latitude: lat,
        longitude: lng,
      }).catch(() => {}); // Ignore duplicate key errors

      return { lat, lng };
    }

    return null;
  } catch (error) {
    console.error('[Geocoding] Error:', error);
    return null;
  }
}

// Get orders with coordinates for a date range
export async function getOrdersWithCoordinates(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];

  const adjustedEndDate = new Date(endDate);
  adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
  adjustedEndDate.setHours(0, 0, 0, 0);

  const results = await db
    .select()
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, adjustedEndDate),
        isNotNull(orders.deliveredAt)
      )
    );

  // Geocode any orders missing coordinates
  for (const order of results) {
    if (!order.customerLatitude || !order.customerLongitude) {
      if (order.customerAddress) {
        const coords = await geocodeAddress(order.customerAddress);
        if (coords) {
          order.customerLatitude = coords.lat as any;
          order.customerLongitude = coords.lng as any;
        }
      }
    }
  }

  return results;
}

// Section 1: Geographic Distribution
export async function calculateGeographicDistribution(startDate: Date, endDate: Date) {
  const ordersData = await getOrdersWithCoordinates(startDate, endDate);
  const restaurantLat = 42.90517;
  const restaurantLng = -78.92295;

  // Cluster orders within 500m radius
  const clusters: { lat: number; lng: number; orders: typeof ordersData; radius: number }[] = [];
  const processed = new Set<number>();

  for (const order of ordersData) {
    if (processed.has(order.id) || !order.customerLatitude || !order.customerLongitude) continue;

    const clusterOrders = [order];
    processed.add(order.id);

    for (const other of ordersData) {
      if (processed.has(other.id) || !other.customerLatitude || !other.customerLongitude) continue;

      const distance = haversineDistance(
        parseFloat(order.customerLatitude.toString()),
        parseFloat(order.customerLongitude.toString()),
        parseFloat(other.customerLatitude.toString()),
        parseFloat(other.customerLongitude.toString())
      );

      if (distance <= 500) {
        clusterOrders.push(other);
        processed.add(other.id);
      }
    }

    clusters.push({
      lat: parseFloat(order.customerLatitude.toString()),
      lng: parseFloat(order.customerLongitude.toString()),
      orders: clusterOrders,
      radius: 500,
    });
  }

  // Calculate metrics per area
  const areaMetrics: Record<string, { total: number; percentage: number; avgPerDay: number }> = {};
  const totalOrders = ordersData.length;
  const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

  for (const order of ordersData) {
    const area = order.area || 'Unknown';
    if (!areaMetrics[area]) {
      areaMetrics[area] = { total: 0, percentage: 0, avgPerDay: 0 };
    }
    areaMetrics[area].total++;
  }

  for (const area in areaMetrics) {
    areaMetrics[area].percentage = (areaMetrics[area].total / totalOrders) * 100;
    areaMetrics[area].avgPerDay = areaMetrics[area].total / dayCount;
  }

  return {
    clusters,
    areaMetrics,
    totalOrders,
  };
}

// Section 2: Time Analysis
export async function calculateTimeAnalysis(startDate: Date, endDate: Date) {
  const ordersData = await getOrdersWithCoordinates(startDate, endDate);

  // Extract hour and day of week
  const hourlyData: Record<number, number> = {};
  const dailyData: Record<number, number> = {};
  const areaTimeData: Record<string, { hourly: Record<number, number>; daily: Record<number, number> }> = {};

  for (const order of ordersData) {
    const hour = order.createdAt.getHours();
    const day = order.createdAt.getDay();
    const area = order.area || 'Unknown';

    hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    dailyData[day] = (dailyData[day] || 0) + 1;

    if (!areaTimeData[area]) {
      areaTimeData[area] = { hourly: {}, daily: {} };
    }
    areaTimeData[area].hourly[hour] = (areaTimeData[area].hourly[hour] || 0) + 1;
    areaTimeData[area].daily[day] = (areaTimeData[area].daily[day] || 0) + 1;
  }

  const peakHour = Math.max(...Object.keys(hourlyData).map(Number), 0);
  const peakDay = Math.max(...Object.keys(dailyData).map(Number), 0);

  return {
    hourlyData,
    dailyData,
    peakHour,
    peakDay,
    areaTimeData,
    orders: ordersData,
  };
}

// Section 3: Delivery Performance
export async function calculateDeliveryPerformance(startDate: Date, endDate: Date) {
  const ordersData = await getOrdersWithCoordinates(startDate, endDate);

  const performanceData: Record<string, { prepTime: number[]; deliveryTime: number[]; totalTime: number[] }> = {};

  for (const order of ordersData) {
    if (!order.readyAt || !order.pickedUpAt || !order.deliveredAt) continue;

    const area = order.area || 'Unknown';
    if (!performanceData[area]) {
      performanceData[area] = { prepTime: [], deliveryTime: [], totalTime: [] };
    }

    const prepTime = (order.readyAt.getTime() - order.createdAt.getTime()) / (1000 * 60); // minutes
    const deliveryTime = (order.deliveredAt.getTime() - order.pickedUpAt.getTime()) / (1000 * 60); // minutes
    const totalTime = (order.deliveredAt.getTime() - order.createdAt.getTime()) / (1000 * 60); // minutes

    performanceData[area].prepTime.push(prepTime);
    performanceData[area].deliveryTime.push(deliveryTime);
    performanceData[area].totalTime.push(totalTime);
  }

  // Calculate averages and ratings
  const areaMetrics: Record<string, { avgPrepTime: number; avgDeliveryTime: number; avgTotalTime: number; rating: string }> = {};

  for (const area in performanceData) {
    const data = performanceData[area];
    const avgPrepTime = data.prepTime.reduce((a, b) => a + b, 0) / data.prepTime.length || 0;
    const avgDeliveryTime = data.deliveryTime.reduce((a, b) => a + b, 0) / data.deliveryTime.length || 0;
    const avgTotalTime = data.totalTime.reduce((a, b) => a + b, 0) / data.totalTime.length || 0;

    let rating = 'Green';
    if (avgTotalTime > 35) rating = 'Red';
    else if (avgTotalTime > 20) rating = 'Yellow';

    areaMetrics[area] = {
      avgPrepTime,
      avgDeliveryTime,
      avgTotalTime,
      rating,
    };
  }

  return {
    areaMetrics,
    orders: ordersData,
  };
}

// Section 4: Driver Performance
export async function calculateDriverPerformance(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return {};

  const ordersData = await getOrdersWithCoordinates(startDate, endDate);
  const driversList = await db.select().from(drivers);

  const driverMetrics: Record<number, {
    driverId: string;
    driverName: string;
    totalDeliveries: number;
    avgDeliveryTime: number;
    onTimeRate: number;
    mostFrequentArea: string;
    efficiencyScore: number;
    locations: typeof ordersData;
  }> = {};

  for (const driver of driversList) {
    const driverOrders = ordersData.filter(o => o.driverId === driver.id && o.pickedUpAt && o.deliveredAt);
    
    if (driverOrders.length === 0) continue;

    const deliveryTimes = driverOrders.map(o => 
      (o.deliveredAt!.getTime() - o.pickedUpAt!.getTime()) / (1000 * 60)
    );
    const avgDeliveryTime = deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length;

    // Assume estimated time is 30 minutes for on-time calculation
    const onTimeCount = driverOrders.filter(o => {
      const deliveryTime = (o.deliveredAt!.getTime() - o.pickedUpAt!.getTime()) / (1000 * 60);
      return deliveryTime <= 30;
    }).length;
    const onTimeRate = (onTimeCount / driverOrders.length) * 100;

    // Most frequent area
    const areaCounts: Record<string, number> = {};
    for (const order of driverOrders) {
      const area = order.area || 'Unknown';
      areaCounts[area] = (areaCounts[area] || 0) + 1;
    }
    const mostFrequentArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    // Efficiency score
    const efficiencyScore = (onTimeRate * 0.5) + ((1 / avgDeliveryTime) * 100 * 0.5);

    driverMetrics[driver.id] = {
      driverId: driver.id.toString(),
      driverName: driver.name,
      totalDeliveries: driverOrders.length,
      avgDeliveryTime,
      onTimeRate,
      mostFrequentArea,
      efficiencyScore,
      locations: driverOrders,
    };
  }

  return driverMetrics;
}

// Section 5: Growth Opportunities
export async function calculateGrowthOpportunities(startDate: Date, endDate: Date) {
  const ordersData = await getOrdersWithCoordinates(startDate, endDate);
  const restaurantLat = 42.90517;
  const restaurantLng = -78.92295;

  // Create 500m × 500m grid
  const gridSize = 500; // meters
  const gridCells: Record<string, {
    orderDensity: number;
    distanceFromRestaurant: number;
    opportunityScore: number;
    orderCount: number;
    orders: typeof ordersData;
  }> = {};

  for (const order of ordersData) {
    if (!order.customerLatitude || !order.customerLongitude) continue;

    const lat = parseFloat(order.customerLatitude.toString());
    const lng = parseFloat(order.customerLongitude.toString());

    // Grid cell key (simplified grid)
    const gridX = Math.floor(lat * 1000 / gridSize);
    const gridY = Math.floor(lng * 1000 / gridSize);
    const cellKey = `${gridX},${gridY}`;

    if (!gridCells[cellKey]) {
      gridCells[cellKey] = {
        orderDensity: 0,
        distanceFromRestaurant: haversineDistance(restaurantLat, restaurantLng, lat, lng),
        opportunityScore: 0,
        orderCount: 0,
        orders: [],
      };
    }

    gridCells[cellKey].orderCount++;
    gridCells[cellKey].orders.push(order);
  }

  // Calculate opportunity scores
  for (const cellKey in gridCells) {
    const cell = gridCells[cellKey];
    const cellArea = gridSize * gridSize; // m²
    cell.orderDensity = cell.orderCount / cellArea;
    cell.opportunityScore = (1 / (cell.orderDensity + 0.001)) * (1 / (cell.distanceFromRestaurant + 1));
  }

  // Find driver shortage zones (avg_total_time > 35 min AND order count > 10)
  const driverShortageZones: Record<string, boolean> = {};
  for (const cellKey in gridCells) {
    const cell = gridCells[cellKey];
    if (cell.orderCount > 10) {
      const totalTimes = cell.orders
        .filter(o => o.createdAt && o.deliveredAt)
        .map(o => (o.deliveredAt!.getTime() - o.createdAt.getTime()) / (1000 * 60));
      const avgTotalTime = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length || 0;
      if (avgTotalTime > 35) {
        driverShortageZones[cellKey] = true;
      }
    }
  }

  // Time slot gaps
  const hourlyData: Record<number, number> = {};
  for (const order of ordersData) {
    const hour = order.createdAt.getHours();
    hourlyData[hour] = (hourlyData[hour] || 0) + 1;
  }
  const maxHourlyOrders = Math.max(...Object.values(hourlyData), 1);
  const timeSlotGaps: Record<number, number> = {};
  for (let hour = 0; hour < 24; hour++) {
    timeSlotGaps[hour] = maxHourlyOrders - (hourlyData[hour] || 0);
  }

  return {
    gridCells,
    driverShortageZones,
    timeSlotGaps,
    topGrowthZones: Object.entries(gridCells)
      .sort((a, b) => b[1].opportunityScore - a[1].opportunityScore)
      .slice(0, 5)
      .map(([key, data]) => ({ key, ...data })),
    topPromotionSlots: Object.entries(timeSlotGaps)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, gap]) => ({ hour: parseInt(hour), gap })),
  };
}
