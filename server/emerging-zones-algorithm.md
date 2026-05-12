# Emerging Demand Zone Detection Algorithm

## Overview
This algorithm identifies residential geographic regions where delivery demand is beginning to grow rapidly and may become future high-demand markets. It uses spatial clustering, temporal trend analysis, and multi-factor scoring.

## Data Sources

### 1. Orders Table
- `latitude`, `longitude` - delivery location
- `created_at`, `completed_at` - timestamps
- `delivery_duration` - total delivery time
- Customer frequency and repeat behavior

### 2. Historical Time Data
- Weekly trends (last 12 weeks)
- Monthly trends (last 6 months)
- Rolling averages (2-week, 4-week, 8-week)
- Growth acceleration patterns

### 3. Competitor Dataset
- Competitor coordinates
- Competitor density per zone
- Competitor proximity to orders

### 4. Residential Geographic Data
- Residential polygons (OpenStreetMap)
- Apartment buildings
- Populated neighborhoods
- Mixed-use residential zones

## Spatial Processing

### Step 1: Zone Aggregation
Use H3 hexagons (resolution 8-9) to aggregate orders into geographic zones:
- Each hexagon represents a geographic area
- Aggregate all orders within each hexagon
- Calculate zone center coordinates
- Count orders per zone per time period

### Step 2: Historical Demand Evolution
For each zone, calculate:
- Orders in week 1-12 (12-week historical window)
- Orders in month 1-6 (6-month historical window)
- Rolling 2-week average
- Rolling 4-week average
- Rolling 8-week average

### Step 3: Detect Acceleration Zones
Identify zones where:
- Historical demand was low (< 10 orders/month average)
- Recent demand is accelerating (current week > previous week)
- Growth trend is positive and increasing

## Calculations

### 1. Historical Demand Trend
```
trend_slope = (recent_orders - historical_avg) / historical_avg
trend_direction = 1 if trend_slope > 0 else -1
trend_strength = min(abs(trend_slope), 1.0)  // Normalize to 0-1
```

### 2. Demand Acceleration
```
growth_velocity = (current_week_orders - previous_week_orders) / previous_week_orders
acceleration_rate = (current_2week_avg - previous_2week_avg) / previous_2week_avg
demand_acceleration_score = (growth_velocity + acceleration_rate) / 2
demand_acceleration_score = min(max(demand_acceleration_score, 0), 1.0)  // Clamp to 0-1
```

### 3. Emerging Customer Score
```
new_customer_count = orders_from_new_customers_in_zone
repeat_customer_count = orders_from_repeat_customers_in_zone
new_customer_ratio = new_customer_count / (new_customer_count + repeat_customer_count)
customer_recurrence = repeat_customer_count / total_orders_in_zone
emerging_customer_score = (new_customer_ratio * 0.6) + (customer_recurrence * 0.4)
```

### 4. Residential Expansion Score
```
residential_polygons_in_zone = count of OSM residential polygons
apartment_buildings_in_zone = count of OSM apartment buildings
residential_density = (residential_polygons + apartment_buildings) / zone_area
residential_expansion_score = min(residential_density / max_residential_density, 1.0)
```

### 5. Competitor Lag Score
```
competitor_count_in_zone = count of competitors within zone
competitor_density = competitor_count_in_zone / zone_area
demand_to_competitor_ratio = zone_orders / max(competitor_count_in_zone, 1)
competitor_lag_score = min(demand_to_competitor_ratio / max_ratio, 1.0)
```

### 6. Delivery Feasibility Score
```
avg_delivery_duration = average delivery time in zone
road_accessibility = 1.0 if zone has good road network else 0.7
delivery_feasibility_score = (1 - min(avg_delivery_duration / 45, 1.0)) * road_accessibility
```

## Final Emerging Score

```
emerging_score = 
  (demand_acceleration_score * 0.35) +
  (emerging_customer_score * 0.20) +
  (residential_expansion_score * 0.20) +
  (delivery_feasibility_score * 0.10) -
  (competitor_lag_score * 0.15)

// Clamp to 0-1
emerging_score = min(max(emerging_score, 0), 1.0)
```

## Zone Classification

Based on `emerging_score`:

| Score Range | Classification | Color | Meaning |
|-------------|-----------------|-------|---------|
| 0.80-1.00 | Rapid Emerging | Bright Blue | Highest growth potential, new demand accelerating |
| 0.60-0.80 | Early Growth | Cyan | Strong growth signals, emerging market |
| 0.40-0.60 | Stable | Green | Consistent demand, mature market |
| 0.20-0.40 | Saturated | Orange | High competition, limited growth |
| 0.00-0.20 | Declining | Gray | Decreasing demand, low potential |

## Output Structure

```typescript
interface EmergingZone {
  zoneId: string;
  hexId: string;
  centerLat: number;
  centerLng: number;
  emergingScore: number;
  classification: 'rapid_emerging' | 'early_growth' | 'stable' | 'saturated' | 'declining';
  color: string;
  
  // Metrics
  demandAcceleration: number;
  newCustomerGrowth: number;
  residentialExpansion: number;
  deliveryFeasibility: number;
  competitorSaturation: number;
  
  // Statistics
  totalOrders: number;
  newCustomerCount: number;
  repeatCustomerCount: number;
  competitorCount: number;
  avgDeliveryDuration: number;
  
  // Temporal data
  weeklyOrders: number[];  // Last 12 weeks
  monthlyOrders: number[]; // Last 6 months
  growthVelocity: number;
  
  // Timestamps
  calculatedAt: Date;
  lastUpdated: Date;
}
```

## Computation Strategy

1. **Batch Processing**: Run analysis nightly or on-demand
2. **Incremental Updates**: Only recalculate zones with new orders
3. **Caching**: Cache zone metrics for 24 hours
4. **Performance**: Process in parallel using zone batches
5. **Scalability**: Use database indexes on (latitude, longitude, created_at)

## Temporal Visualization Support

- **Weekly Playback**: Show zone scores for each week over 12-week period
- **Monthly Trend**: Show zone scores for each month over 6-month period
- **Animated Growth**: Visualize zones changing color as they move through classifications
- **Historical Comparison**: Compare current scores vs. previous periods
