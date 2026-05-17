# Phase 3: Real Machine Learning Architecture

## Overview
Production-grade ML system with XGBoost, LightGBM, and Ensemble models for demand forecasting.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Node.js Application                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  tRPC Endpoints (learning.*)                         │   │
│  │  - predictDemand()                                   │   │
│  │  - trainModel()                                      │   │
│  │  - getModelMetrics()                                 │   │
│  │  - explainPrediction()                               │   │
│  │  - rollbackModel()                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            Python ML Service (FastAPI)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Model Training Pipeline                             │   │
│  │  - Feature Engineering                               │   │
│  │  - XGBoost Model                                     │   │
│  │  - LightGBM Model                                    │   │
│  │  - Ensemble Combiner                                 │   │
│  │  - Model Versioning                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Inference Engine                                    │   │
│  │  - Real-time Prediction                              │   │
│  │  - SHAP Explainability                               │   │
│  │  - Feature Importance                                │   │
│  │  - Confidence Intervals                              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Evaluation Metrics                                  │   │
│  │  - MAE, RMSE, MAPE                                   │   │
│  │  - Prediction Interval Accuracy                      │   │
│  │  - Model Comparison                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Read/Write
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MySQL Database                                      │   │
│  │  - orders (training data)                            │   │
│  │  - ml_models (metadata)                              │   │
│  │  - ml_predictions (predictions + explanations)       │   │
│  │  - ml_metrics (evaluation metrics)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  S3 Storage                                          │   │
│  │  - model_v1.pkl, model_v2.pkl (serialized models)   │   │
│  │  - training_data.csv (historical data)               │   │
│  │  - feature_importance.json (SHAP values)             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Feature Engineering

### Temporal Features
- Hour of day (0-23)
- Day of week (0-6)
- Is weekend (boolean)
- Is holiday (boolean)
- Season (0-3)
- Month (1-12)
- Week of year (1-52)
- Is peak hour (boolean)

### Order Features
- Historical demand (rolling averages: 7d, 14d, 30d)
- Demand trend (linear regression slope)
- Demand volatility (std dev)
- Day-of-week effect
- Hour-of-day effect
- Seasonal pattern

### Operational Features
- Active drivers count
- Driver availability ratio
- Current backlog (pending orders)
- Backlog trend
- Average delivery time
- Delivery time trend

### External Features
- Weather condition (encoded)
- Weather severity (0-1)
- Active events count
- Event intensity (0-1)
- Zone density (orders per km²)
- Zone growth rate

### Derived Features
- Demand intensity (normalized 0-1)
- Delivery pressure (backlog / drivers)
- System stress (backlog * delivery_time)
- Seasonal adjustment factor

## Model Architecture

### 1. XGBoost Model
- **Purpose**: Primary model with strong generalization
- **Parameters**:
  - max_depth: 6
  - learning_rate: 0.1
  - n_estimators: 200
  - subsample: 0.8
  - colsample_bytree: 0.8
- **Output**: Demand prediction + prediction interval

### 2. LightGBM Model
- **Purpose**: Fast inference, handles categorical features
- **Parameters**:
  - num_leaves: 31
  - learning_rate: 0.05
  - n_estimators: 200
  - feature_fraction: 0.8
  - bagging_fraction: 0.8
- **Output**: Demand prediction + feature importance

### 3. Ensemble Model
- **Strategy**: Weighted average of XGBoost + LightGBM
- **Weights**: Optimized based on validation performance
- **Output**: Final prediction + confidence score

## Evaluation Metrics

### Regression Metrics
- **MAE** (Mean Absolute Error): Average absolute deviation
- **RMSE** (Root Mean Squared Error): Penalizes large errors
- **MAPE** (Mean Absolute Percentage Error): Percentage-based error

### Prediction Interval Metrics
- **Coverage**: % of actual values within predicted interval
- **Width**: Average interval width (precision)
- **Efficiency**: Coverage / Width ratio

### Model Comparison
- Cross-validation scores
- Test set performance
- Temporal performance (by hour/day)
- Zone-specific performance

## Training Pipeline

### Data Preparation
1. Fetch historical orders from database
2. Engineer features from raw data
3. Handle missing values (forward fill, interpolation)
4. Normalize features (StandardScaler)
5. Split into train/validation/test (70/15/15)

### Model Training
1. Train XGBoost model
2. Train LightGBM model
3. Calculate feature importance (SHAP)
4. Optimize ensemble weights
5. Calculate prediction intervals

### Model Versioning
- Version format: `v{date}_{time}_{hash}`
- Store metadata: training_date, metrics, features_used
- Keep last 5 versions for rollback
- Archive old versions to S3

### Incremental Retraining
- Trigger: Daily at 2 AM UTC
- Data: Last 90 days of orders
- Validation: Compare with previous model
- Deployment: Auto-deploy if improvement > 2%
- Fallback: Rollback if validation fails

## Explainability

### SHAP Values
- Calculate SHAP values for each prediction
- Identify top 5 contributing features
- Generate human-readable explanations

### Feature Importance
- Global importance: Average |SHAP value|
- Local importance: SHAP values for specific prediction
- Temporal importance: How importance changes over time

### Prediction Explanations
Examples:
- "Demand increased 15% due to peak hour (8 PM) and high backlog"
- "Confidence dropped to 65% due to unusual weather conditions"
- "Prediction 20% higher than usual due to active event nearby"

## Database Schema

### ml_models
```sql
CREATE TABLE ml_models (
  id VARCHAR(36) PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  model_type ENUM('xgboost', 'lightgbm', 'ensemble') NOT NULL,
  zone_id VARCHAR(50) NOT NULL,
  s3_key VARCHAR(255) NOT NULL,
  training_date DATETIME NOT NULL,
  validation_date DATETIME NOT NULL,
  mae DECIMAL(10, 4),
  rmse DECIMAL(10, 4),
  mape DECIMAL(10, 4),
  pi_coverage DECIMAL(5, 2),
  is_active BOOLEAN DEFAULT FALSE,
  is_production BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### ml_predictions
```sql
CREATE TABLE ml_predictions (
  id VARCHAR(36) PRIMARY KEY,
  model_id VARCHAR(36) NOT NULL,
  zone_id VARCHAR(50) NOT NULL,
  forecast_time DATETIME NOT NULL,
  predicted_demand DECIMAL(10, 2) NOT NULL,
  confidence DECIMAL(5, 2) NOT NULL,
  prediction_interval_lower DECIMAL(10, 2),
  prediction_interval_upper DECIMAL(10, 2),
  top_features JSON,
  shap_values JSON,
  explanation TEXT,
  actual_demand DECIMAL(10, 2),
  error DECIMAL(10, 4),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES ml_models(id)
);
```

### ml_metrics
```sql
CREATE TABLE ml_metrics (
  id VARCHAR(36) PRIMARY KEY,
  model_id VARCHAR(36) NOT NULL,
  metric_date DATE NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(10, 4) NOT NULL,
  zone_id VARCHAR(50),
  hour_of_day INT,
  day_of_week INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES ml_models(id),
  INDEX idx_model_date (model_id, metric_date)
);
```

## API Endpoints

### Prediction
```
POST /api/ml/predict
{
  "zone_id": "downtown",
  "forecast_time": "2026-05-18T14:00:00Z",
  "active_drivers": 5,
  "current_backlog": 12,
  "weather": "clear"
}
Response:
{
  "predicted_demand": 18.5,
  "confidence": 0.87,
  "interval_lower": 15.2,
  "interval_upper": 21.8,
  "top_features": [
    {"name": "hour_of_day", "impact": 0.35},
    {"name": "backlog", "impact": 0.28},
    ...
  ],
  "explanation": "Demand expected to be high due to peak hour (2 PM) and elevated backlog"
}
```

### Training
```
POST /api/ml/train
{
  "zone_id": "downtown",
  "lookback_days": 90
}
Response:
{
  "model_id": "v20260518_140000_abc123",
  "status": "training",
  "eta_seconds": 120
}
```

### Model Metrics
```
GET /api/ml/metrics?model_id=v20260518_140000_abc123
Response:
{
  "mae": 2.34,
  "rmse": 3.12,
  "mape": 12.5,
  "pi_coverage": 0.92,
  "validation_date": "2026-05-18T14:30:00Z"
}
```

### Rollback
```
POST /api/ml/rollback
{
  "zone_id": "downtown",
  "target_version": "v20260517_140000_xyz789"
}
Response:
{
  "status": "success",
  "previous_version": "v20260518_140000_abc123",
  "current_version": "v20260517_140000_xyz789"
}
```

## Deployment Strategy

### Development
- Train on local data
- Validate on test set
- Manual testing of predictions

### Staging
- Deploy to staging environment
- Run shadow mode (predictions without affecting system)
- Monitor for 24 hours

### Production
- Auto-deploy if validation improves by >2%
- Gradual rollout (10% → 50% → 100%)
- Automatic rollback on error rate spike
- Monitor key metrics continuously

## Next Steps
1. Set up Python environment with required packages
2. Implement feature engineering module
3. Build model training pipeline
4. Create evaluation framework
5. Integrate with Node.js via FastAPI
6. Implement SHAP explainability
7. Set up daily retraining schedule
8. Create monitoring dashboard
