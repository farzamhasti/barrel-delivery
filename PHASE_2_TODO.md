# PHASE 2 — REAL DATABASE LEARNING INTEGRATION

## Overview
Transform the Geo AI system from using mock/synthetic data to learning from real operational data captured in the database. This phase establishes the foundation for machine learning by ensuring the system captures, stores, and learns from actual delivery orders, driver performance, and operational outcomes.

---

## 2.1 Database Schema Enhancements

### 2.1.1 Order Outcome Tracking
- [ ] Add `actual_delivery_time` column to orders table (minutes)
- [ ] Add `actual_demand_volume` column to delivery_zones table (daily aggregation)
- [ ] Add `actual_peak_hours` column to delivery_zones table (time range string)
- [ ] Add `weather_conditions_actual` column to delivery_zones table (JSON)
- [ ] Add `driver_shortage_occurred` boolean column to delivery_zones table
- [ ] Add `operational_pressure_actual` column to delivery_zones table (0-100)
- [ ] Create migration SQL and execute via `webdev_execute_sql`

### 2.1.2 Forecast Accuracy Tracking
- [ ] Add `forecast_id` column to orders table (FK to forecasts)
- [ ] Add `forecast_accuracy_score` column to forecasts table (0-100)
- [ ] Add `actual_vs_predicted_orders` column to forecasts table (JSON with diff)
- [ ] Add `learning_confidence_updated` column to forecasts table (timestamp)
- [ ] Create indexes on `forecast_id`, `delivery_zone_id`, `created_at` for query performance

### 2.1.3 Driver Performance Metrics
- [ ] Add `driver_id` column to orders table
- [ ] Add `driver_performance_score` column to drivers table (0-100)
- [ ] Add `average_delivery_time` column to drivers table (minutes)
- [ ] Add `on_time_delivery_rate` column to drivers table (percentage)
- [ ] Add `weather_performance_multiplier` column to drivers table (0.5-2.0)

---

## 2.2 Real Data Ingestion Pipeline

### 2.2.1 Order Completion Handler
- [ ] Create tRPC procedure `orders.recordCompletion` that accepts:
  - orderId
  - actual_delivery_time
  - actual_distance
  - driver_id
  - weather_conditions_actual
  - traffic_conditions_actual
- [ ] Validate input data and update orders table
- [ ] Trigger forecast accuracy calculation
- [ ] Update driver performance metrics

### 2.2.2 Zone-Level Aggregation
- [ ] Create Heartbeat job (daily at 23:00 UTC) to aggregate zone-level metrics:
  - Total orders delivered in zone
  - Average delivery time by zone
  - Peak hours (actual vs predicted)
  - Driver shortage indicators
  - Weather impact on delivery times
- [ ] Store aggregated data in `delivery_zones` table
- [ ] Calculate zone-level forecast accuracy

### 2.2.3 Forecast Accuracy Calculation
- [ ] Create function `calculateForecastAccuracy(forecastId)`:
  - Compare predicted_orders vs actual_orders
  - Compare predicted_peak_hours vs actual_peak_hours
  - Calculate accuracy score (0-100)
  - Identify prediction errors and patterns
- [ ] Update `forecast_accuracy_score` in database
- [ ] Log accuracy metrics for ML training

---

## 2.3 Learning System Integration

### 2.3.1 Historical Data Analysis
- [ ] Create tRPC procedure `analytics.getHistoricalAccuracy` that returns:
  - Forecast accuracy trends (7-day, 30-day, 90-day)
  - Accuracy by time of day
  - Accuracy by zone
  - Accuracy by weather conditions
  - Learning curve visualization data

### 2.3.2 Confidence Score Adjustment
- [ ] Update `determineForecastMode` function to use historical accuracy:
  - If accuracy < 30%: EARLY_LEARNING (confidence 20-40%)
  - If accuracy 30-60%: LEARNING (confidence 40-60%)
  - If accuracy 60-80%: TRAINED (confidence 60-80%)
  - If accuracy > 80%: PRODUCTION (confidence 80-95%)
- [ ] Adjust FastAPI confidence_score based on learning phase

### 2.3.3 Zone-Specific Learning
- [ ] Create function `getZoneLearningMetrics(zoneId)` that returns:
  - Historical accuracy for this zone
  - Seasonal patterns
  - Day-of-week patterns
  - Weather sensitivity
  - Driver availability patterns

---

## 2.4 Data Quality & Validation

### 2.4.1 Anomaly Detection
- [ ] Create function `detectAnomalies(zoneId, metric)` that identifies:
  - Delivery times > 2 standard deviations from mean
  - Unusual demand spikes
  - Driver shortage events
  - Weather-related outliers
- [ ] Flag anomalies for manual review
- [ ] Exclude anomalies from ML training data

### 2.4.2 Data Completeness Checks
- [ ] Create Heartbeat job (hourly) to verify:
  - All completed orders have actual_delivery_time
  - All zones have daily aggregation
  - No gaps in historical data
  - Data freshness (< 1 hour old)
- [ ] Alert on missing data
- [ ] Implement data backfill procedures

---

## 2.5 Real-Time Learning Dashboard

### 2.5.1 Learning Metrics Display
- [ ] Add "Learning Progress" section to Geomarketing Analytics:
  - Current learning phase (EARLY_LEARNING / LEARNING / TRAINED / PRODUCTION)
  - Forecast accuracy (7-day trend)
  - Confidence score progression
  - Data points collected
  - Estimated time to PRODUCTION phase

### 2.5.2 Zone-Level Learning Status
- [ ] Display learning status for each zone:
  - Zone name
  - Current accuracy
  - Learning phase
  - Data points collected
  - Recommendations for improvement

### 2.5.3 Historical Accuracy Chart
- [ ] Create chart showing:
  - Accuracy trend over time (7-day, 30-day, 90-day)
  - Confidence score progression
  - Learning phase transitions
  - Accuracy by zone

---

## 2.6 Heartbeat Scheduled Tasks

### 2.6.1 Daily Zone Aggregation (23:00 UTC)
- [ ] Path: `/api/scheduled/aggregateZoneMetrics`
- [ ] Aggregates all completed orders from previous day
- [ ] Calculates zone-level metrics
- [ ] Updates delivery_zones table
- [ ] Triggers forecast accuracy calculation

### 2.6.2 Hourly Data Freshness Check (every hour)
- [ ] Path: `/api/scheduled/checkDataFreshness`
- [ ] Verifies data completeness
- [ ] Alerts on missing data
- [ ] Triggers backfill if needed

### 2.6.3 Weekly Learning Report (Monday 09:00 UTC)
- [ ] Path: `/api/scheduled/generateLearningReport`
- [ ] Generates learning progress report
- [ ] Calculates accuracy trends
- [ ] Identifies zones needing more data
- [ ] Sends notification to owner

---

## 2.7 Integration with FastAPI

### 2.7.1 Learning Mode Feedback Loop
- [ ] Update FastAPI `/api/v1/demand/predict` to accept `actual_data`:
  - actual_orders (for accuracy calculation)
  - actual_peak_hours (for pattern learning)
  - weather_conditions_actual (for weather sensitivity)
- [ ] Calculate accuracy immediately after receiving actual data
- [ ] Adjust confidence score based on accuracy

### 2.7.2 Historical Data Access
- [ ] Create FastAPI endpoint `/api/v1/learning/metrics`:
  - Returns historical accuracy by zone
  - Returns learning phase for each zone
  - Returns confidence score trends
  - Used by Node.js to adjust predictions

---

## 2.8 Testing & Validation

### 2.8.1 Unit Tests
- [ ] Test `calculateForecastAccuracy` function
- [ ] Test `detectAnomalies` function
- [ ] Test zone aggregation logic
- [ ] Test learning phase determination

### 2.8.2 Integration Tests
- [ ] Test order completion flow
- [ ] Test Heartbeat job execution
- [ ] Test data aggregation pipeline
- [ ] Test accuracy calculation end-to-end

### 2.8.3 Data Validation Tests
- [ ] Verify historical data integrity
- [ ] Verify accuracy calculations
- [ ] Verify no data loss during aggregation

---

## 2.9 Documentation

### 2.9.1 Learning System Documentation
- [ ] Document learning phases and confidence scores
- [ ] Document data schema changes
- [ ] Document Heartbeat job specifications
- [ ] Document API endpoints for learning metrics

### 2.9.2 Operational Procedures
- [ ] Document how to monitor learning progress
- [ ] Document how to handle data anomalies
- [ ] Document how to backfill missing data
- [ ] Document troubleshooting procedures

---

## Success Criteria

✅ Real order data is captured and stored in database  
✅ Forecast accuracy is calculated daily  
✅ Learning phase transitions based on accuracy  
✅ Confidence scores adjust based on learning progress  
✅ Dashboard displays learning metrics  
✅ Heartbeat jobs execute reliably  
✅ No data loss or gaps in historical data  
✅ System transitions from EARLY_LEARNING to TRAINED phase after 30 days of data

---

## Estimated Timeline
- Database schema: 2-3 hours
- Data ingestion: 3-4 hours
- Learning system: 4-5 hours
- Dashboard UI: 2-3 hours
- Testing & validation: 3-4 hours
- **Total: 14-19 hours**

