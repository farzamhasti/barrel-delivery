"""
Barrel Delivery ML Service
Production-grade machine learning service for demand forecasting
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import ML modules
from ml.feature_engineering import FeatureEngineer
from ml.model_trainer import ModelTrainer
from ml.model_inference import ModelInference
from ml.model_versioning import ModelVersioning
from ml.explainability import ExplainabilityEngine

# Initialize FastAPI app
app = FastAPI(
    title="Barrel Delivery ML Service",
    description="Production ML service for demand forecasting",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ML components
feature_engineer = FeatureEngineer()
model_trainer = ModelTrainer()
model_inference = ModelInference()
model_versioning = ModelVersioning()
explainability_engine = ExplainabilityEngine()


# ============================================================================
# Request/Response Models
# ============================================================================

class PredictionRequest(BaseModel):
    """Request model for demand prediction"""
    zone_id: str
    forecast_time: str  # ISO format
    active_drivers: Optional[int] = None
    current_backlog: Optional[int] = None
    weather_condition: Optional[str] = None
    weather_severity: Optional[float] = None
    active_events: Optional[int] = None
    event_intensity: Optional[float] = None
    zone_density: Optional[float] = None


class PredictionResponse(BaseModel):
    """Response model for demand prediction"""
    predicted_demand: float
    confidence: float
    interval_lower: float
    interval_upper: float
    top_features: List[Dict[str, Any]]
    explanation: str
    model_version: str
    prediction_timestamp: str


class TrainingRequest(BaseModel):
    """Request model for model training"""
    zone_id: str
    lookback_days: Optional[int] = 90
    force_retrain: Optional[bool] = False


class TrainingResponse(BaseModel):
    """Response model for training job"""
    model_id: str
    zone_id: str
    status: str  # 'queued', 'training', 'completed', 'failed'
    eta_seconds: Optional[int] = None
    metrics: Optional[Dict[str, float]] = None


class MetricsRequest(BaseModel):
    """Request model for model metrics"""
    model_id: Optional[str] = None
    zone_id: Optional[str] = None
    lookback_days: Optional[int] = 30


class MetricsResponse(BaseModel):
    """Response model for model metrics"""
    model_id: str
    mae: float
    rmse: float
    mape: float
    pi_coverage: float
    pi_width: float
    validation_date: str
    training_samples: int


class RollbackRequest(BaseModel):
    """Request model for model rollback"""
    zone_id: str
    target_version: str


class RollbackResponse(BaseModel):
    """Response model for rollback"""
    status: str
    previous_version: str
    current_version: str
    rollback_timestamp: str


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str
    timestamp: str
    version: str
    models_loaded: int


# ============================================================================
# Health Check Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        models_loaded = model_versioning.get_active_models_count()
        return HealthResponse(
            status="healthy",
            timestamp=datetime.utcnow().isoformat(),
            version="1.0.0",
            models_loaded=models_loaded
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Service unhealthy")


# ============================================================================
# Prediction Endpoints
# ============================================================================

@app.post("/api/ml/predict", response_model=PredictionResponse)
async def predict_demand(request: PredictionRequest):
    """
    Predict demand for a given zone and time
    
    Returns:
    - predicted_demand: Point estimate
    - confidence: Confidence score (0-1)
    - interval_lower/upper: Prediction interval bounds
    - top_features: Most influential features
    - explanation: Human-readable explanation
    """
    try:
        logger.info(f"Prediction request for zone {request.zone_id} at {request.forecast_time}")
        
        # Parse forecast time
        forecast_dt = datetime.fromisoformat(request.forecast_time.replace('Z', '+00:00'))
        
        # Engineer features
        features = feature_engineer.engineer_features(
            zone_id=request.zone_id,
            forecast_time=forecast_dt,
            active_drivers=request.active_drivers,
            current_backlog=request.current_backlog,
            weather_condition=request.weather_condition,
            weather_severity=request.weather_severity,
            active_events=request.active_events,
            event_intensity=request.event_intensity,
            zone_density=request.zone_density
        )
        
        # Get prediction
        prediction = model_inference.predict(
            zone_id=request.zone_id,
            features=features
        )
        
        # Generate explanation
        explanation = explainability_engine.generate_explanation(
            prediction=prediction,
            features=features,
            zone_id=request.zone_id
        )
        
        return PredictionResponse(
            predicted_demand=prediction['demand'],
            confidence=prediction['confidence'],
            interval_lower=prediction['interval_lower'],
            interval_upper=prediction['interval_upper'],
            top_features=prediction['top_features'],
            explanation=explanation,
            model_version=prediction['model_version'],
            prediction_timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# ============================================================================
# Training Endpoints
# ============================================================================

@app.post("/api/ml/train", response_model=TrainingResponse)
async def train_model(request: TrainingRequest):
    """
    Train a new model for a zone
    
    Returns:
    - model_id: Unique model identifier
    - status: Training status
    - eta_seconds: Estimated time to completion
    """
    try:
        logger.info(f"Training request for zone {request.zone_id}")
        
        # Start training job
        job = model_trainer.train_async(
            zone_id=request.zone_id,
            lookback_days=request.lookback_days,
            force_retrain=request.force_retrain
        )
        
        return TrainingResponse(
            model_id=job['model_id'],
            zone_id=request.zone_id,
            status=job['status'],
            eta_seconds=job.get('eta_seconds')
        )
        
    except Exception as e:
        logger.error(f"Training failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@app.get("/api/ml/train/{model_id}")
async def get_training_status(model_id: str):
    """Get training job status"""
    try:
        status = model_trainer.get_job_status(model_id)
        if not status:
            raise HTTPException(status_code=404, detail="Training job not found")
        return status
    except Exception as e:
        logger.error(f"Status check failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")


# ============================================================================
# Metrics Endpoints
# ============================================================================

@app.post("/api/ml/metrics", response_model=MetricsResponse)
async def get_model_metrics(request: MetricsRequest):
    """
    Get model performance metrics
    
    Returns:
    - mae: Mean Absolute Error
    - rmse: Root Mean Squared Error
    - mape: Mean Absolute Percentage Error
    - pi_coverage: Prediction Interval Coverage
    - pi_width: Prediction Interval Width
    """
    try:
        metrics = model_versioning.get_metrics(
            model_id=request.model_id,
            zone_id=request.zone_id,
            lookback_days=request.lookback_days
        )
        
        if not metrics:
            raise HTTPException(status_code=404, detail="Metrics not found")
        
        return MetricsResponse(**metrics)
        
    except Exception as e:
        logger.error(f"Metrics retrieval failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Metrics retrieval failed: {str(e)}")


# ============================================================================
# Rollback Endpoints
# ============================================================================

@app.post("/api/ml/rollback", response_model=RollbackResponse)
async def rollback_model(request: RollbackRequest):
    """
    Rollback to a previous model version
    
    Returns:
    - status: Rollback status
    - previous_version: Version being replaced
    - current_version: New active version
    """
    try:
        logger.info(f"Rollback request for zone {request.zone_id} to {request.target_version}")
        
        result = model_versioning.rollback(
            zone_id=request.zone_id,
            target_version=request.target_version
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Target version not found")
        
        return RollbackResponse(
            status="success",
            previous_version=result['previous_version'],
            current_version=result['current_version'],
            rollback_timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Rollback failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Rollback failed: {str(e)}")


# ============================================================================
# Model Management Endpoints
# ============================================================================

@app.get("/api/ml/models/{zone_id}")
async def list_zone_models(zone_id: str):
    """List all models for a zone"""
    try:
        models = model_versioning.list_models(zone_id)
        return {"zone_id": zone_id, "models": models}
    except Exception as e:
        logger.error(f"Model listing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Model listing failed: {str(e)}")


@app.get("/api/ml/models/{zone_id}/{model_id}")
async def get_model_info(zone_id: str, model_id: str):
    """Get detailed model information"""
    try:
        info = model_versioning.get_model_info(zone_id, model_id)
        if not info:
            raise HTTPException(status_code=404, detail="Model not found")
        return info
    except Exception as e:
        logger.error(f"Model info retrieval failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Model info retrieval failed: {str(e)}")


# ============================================================================
# Startup/Shutdown Events
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize ML service on startup"""
    logger.info("ML Service starting up...")
    try:
        # Load active models
        model_versioning.load_active_models()
        logger.info("Active models loaded successfully")
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("ML Service shutting down...")
    try:
        model_versioning.cleanup()
        logger.info("Cleanup completed")
    except Exception as e:
        logger.error(f"Shutdown error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("ML_SERVICE_PORT", 8000))
    host = os.getenv("ML_SERVICE_HOST", "0.0.0.0")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )
