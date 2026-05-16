# Geo AI Spatial Intelligence Microservice Architecture

## System Overview

The Geo AI microservice is a separate Python-based operational intelligence engine that handles all machine learning, spatial analysis, and forecasting for the Barrel Delivery platform.

## Technology Stack

- **Framework:** FastAPI (async, high-performance)
- **Database:** PostgreSQL with PostGIS extensions
- **ML Libraries:** scikit-learn, XGBoost, LightGBM, GeoPandas, Shapely
- **Clustering:** DBSCAN, HDBSCAN
- **Async:** asyncio, aiohttp
- **Deployment:** Docker, Docker Compose

## Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Node.js Express API                      │
│              (Order Management, Auth, UI)                   │
└────────────────────┬────────────────────────────────────────┘
                     │ tRPC/REST API calls
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Geo AI Python Microservice                      │
│                   (FastAPI)                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         ML Forecasting Engine                        │  │
│  │  - XGBoost demand prediction                         │  │
│  │  - LightGBM delay prediction                         │  │
│  │  - Random Forest baseline                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Spatial Analysis Engine                      │  │
│  │  - DBSCAN hotspot detection                         │  │
│  │  - HDBSCAN dynamic clustering                       │  │
│  │  - PostGIS spatial queries                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Feature Engineering Pipeline                │  │
│  │  - Temporal features (hour, day, season)            │  │
│  │  - Weather features (precipitation, wind, temp)     │  │
│  │  - Spatial features (density, clusters)             │  │
│  │  - Operational features (drivers, delays)           │  │
│  │  - Event features (sports, holidays)                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Recommendation Engine                        │  │
│  │  - Dynamic alert generation                         │  │
│  │  - Operational recommendations                      │  │
│  │  - Confidence scoring                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Data Pipeline                               │  │
│  │  - Weather data ingestion (5-15 min refresh)        │  │
│  │  - Sports/events data integration                   │  │
│  │  - Order data processing                            │  │
│  │  - Model training/retraining                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│         PostgreSQL + PostGIS Database                       │
│                                                             │
│  - orders (with lat/lon for spatial indexing)             │
│  - predictions (demand, hotspots, risks)                  │
│  - ml_models (versions, performance metrics)              │
│  - events (sports, holidays, concerts)                    │
│  - weather_history (historical weather data)              │
│  - spatial_zones (delivery zones, hotspots)               │
│  - alerts (generated AI alerts)                           │
│  - recommendations (generated recommendations)            │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Demand Forecasting
- `POST /api/forecast/demand` - Single zone demand prediction
- `POST /api/forecast/demand-batch` - Multiple zones demand prediction
- `GET /api/forecast/history` - Historical forecast data

### Hotspot Detection
- `GET /api/hotspots/active` - Current active hotspots
- `GET /api/hotspots/predict` - Predicted future hotspots
- `GET /api/hotspots/heatmap` - Heatmap data for visualization

### Risk Assessment
- `POST /api/risk/predict` - Risk prediction for zones
- `GET /api/risk/alerts` - Risk-based alerts

### Recommendations
- `GET /api/recommendations/generate` - Generate operational recommendations
- `GET /api/recommendations/dashboard` - Dashboard recommendations

### Model Management
- `POST /api/models/train` - Trigger model retraining
- `GET /api/models/status` - Model training status
- `GET /api/models/performance` - Model performance metrics

### Data Management
- `POST /api/data/ingest-orders` - Ingest new orders
- `POST /api/data/ingest-weather` - Ingest weather data
- `POST /api/data/ingest-events` - Ingest sports/event data

## Database Schema (PostgreSQL + PostGIS)

### Core Tables

**orders**
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) UNIQUE,
  timestamp TIMESTAMP,
  location GEOMETRY(POINT, 4326),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  delivery_time_minutes INT,
  preparation_time_minutes INT,
  total_completion_minutes INT,
  driver_id INT,
  order_amount DECIMAL(10, 2),
  zone_id INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_location ON orders USING GIST(location);
CREATE INDEX idx_orders_timestamp ON orders(timestamp);
CREATE INDEX idx_orders_zone ON orders(zone_id);
```

**predictions**
```sql
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  prediction_type VARCHAR(50), -- 'demand', 'delay', 'shortage'
  zone_id INT,
  forecast_window VARCHAR(50), -- '30m', '1h', '2h', 'tonight', 'daily'
  predicted_value DECIMAL(10, 2),
  confidence_score DECIMAL(3, 2),
  base_forecast DECIMAL(10, 2),
  weather_adjusted BOOLEAN,
  weather_impact JSONB,
  demand_multiplier DECIMAL(4, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP
);

CREATE INDEX idx_predictions_zone ON predictions(zone_id);
CREATE INDEX idx_predictions_timestamp ON predictions(created_at);
```

**hotspots**
```sql
CREATE TABLE hotspots (
  id SERIAL PRIMARY KEY,
  location GEOMETRY(POINT, 4326),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  intensity DECIMAL(5, 2),
  radius_meters INT,
  order_count INT,
  prediction_type VARCHAR(50), -- 'current', 'predicted'
  confidence_score DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP
);

CREATE INDEX idx_hotspots_location ON hotspots USING GIST(location);
```

**ml_models**
```sql
CREATE TABLE ml_models (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(100),
  model_type VARCHAR(50), -- 'xgboost', 'lightgbm', 'random_forest'
  version INT,
  training_date TIMESTAMP,
  accuracy DECIMAL(5, 4),
  precision DECIMAL(5, 4),
  recall DECIMAL(5, 4),
  f1_score DECIMAL(5, 4),
  model_path VARCHAR(255),
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**events**
```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(255),
  event_type VARCHAR(50), -- 'nhl_game', 'cfl_game', 'holiday', 'concert'
  event_date DATE,
  location VARCHAR(255),
  expected_impact DECIMAL(3, 2), -- multiplier
  created_at TIMESTAMP DEFAULT NOW()
);
```

**alerts**
```sql
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(50), -- 'demand_surge', 'delay_risk', 'shortage'
  zone_id INT,
  message TEXT,
  severity VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  confidence_score DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  acknowledged_at TIMESTAMP
);
```

## Feature Engineering Pipeline

### Temporal Features
- Hour of day (0-23)
- Day of week (0-6)
- Is weekend (boolean)
- Is holiday (boolean)
- Days until next holiday
- Season (spring, summer, fall, winter)
- Opening hours indicator
- Closing hours indicator
- Peak period indicator (5-7 PM, 7-9 PM, 9-11 PM)

### Weather Features
- Current temperature
- Feels-like temperature
- Precipitation (mm)
- Snowfall (mm)
- Wind speed (km/h)
- Wind gusts (km/h)
- Visibility (km)
- Weather condition (clear, cloudy, rain, snow, storm)
- Weather severity (low, medium, high, critical)

### Spatial Features
- Zone ID
- Zone density (orders per km²)
- Distance to city center
- Distance to competitor
- Nearby order clusters (DBSCAN)
- Hotspot intensity
- Historical order density

### Operational Features
- Active drivers count
- Average delivery time (historical)
- Average preparation time (historical)
- Current backlog
- Driver availability percentage
- Recent delay percentage

### Event Features
- NHL game today (boolean)
- CFL/NFL game today (boolean)
- Concert/event today (boolean)
- Holiday (boolean)
- Long weekend (boolean)
- Days since last event

## Model Training Pipeline

1. **Data Collection:** Aggregate orders, weather, events, driver data
2. **Feature Engineering:** Create all temporal, spatial, weather, operational, event features
3. **Data Cleaning:** Handle missing values, outliers, normalization
4. **Train/Test Split:** 80/20 split with temporal ordering
5. **Model Training:** Train XGBoost, LightGBM, Random Forest
6. **Hyperparameter Tuning:** Grid search or Bayesian optimization
7. **Validation:** Cross-validation, backtesting
8. **Model Selection:** Choose best performing model
9. **Performance Tracking:** Store metrics in database
10. **Model Deployment:** Activate new model version

## Continuous Learning

- **Daily Retraining:** Retrain models with new order data
- **Weekly Evaluation:** Assess model performance vs. actuals
- **Monthly Optimization:** Hyperparameter tuning and feature engineering
- **Feedback Loop:** Use actual delivery times to improve predictions
- **Event Learning:** Learn from sports/event outcomes

## Business Hours Logic

```python
OPERATING_HOURS = {
    'sunday': (16, 22),      # 4 PM - 10 PM
    'monday': (16, 22),      # 4 PM - 10 PM
    'tuesday': (16, 22),     # 4 PM - 10 PM
    'wednesday': (16, 22),   # 4 PM - 10 PM
    'thursday': (16, 22),    # 4 PM - 10 PM
    'friday': (16, 23),      # 4 PM - 11 PM
    'saturday': (16, 23),    # 4 PM - 11 PM
}

def is_operating_hours():
    """Check if current time is within operating hours"""
    now = datetime.now()
    day_name = now.strftime('%A').lower()
    hour = now.hour
    
    if day_name not in OPERATING_HOURS:
        return False
    
    start, end = OPERATING_HOURS[day_name]
    return start <= hour < end

def get_next_operating_window():
    """Get next operating window start time"""
    # Implementation to calculate next operating window
```

## Deployment

### Docker Setup
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  geo-ai:
    build: ./geo-ai
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/barrel_delivery
      - WEATHER_API_KEY=...
    depends_on:
      - postgres
    volumes:
      - ./models:/app/models

  postgres:
    image: postgis/postgis:15-3.3
    environment:
      - POSTGRES_DB=barrel_delivery
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Next Steps

1. Create FastAPI project structure
2. Setup PostgreSQL + PostGIS database
3. Implement feature engineering pipeline
4. Build ML models
5. Create API endpoints
6. Implement business hours logic
7. Integrate with Node.js backend
8. Deploy and test
