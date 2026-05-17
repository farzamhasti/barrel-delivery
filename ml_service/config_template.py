"""
ML Service Configuration Template
Copy and modify as needed for your environment
"""

import os
from typing import Optional

class MLServiceConfig:
    """ML Service Configuration"""
    
    # Service Settings
    ML_SERVICE_HOST: str = os.getenv("ML_SERVICE_HOST", "0.0.0.0")
    ML_SERVICE_PORT: int = int(os.getenv("ML_SERVICE_PORT", "8000"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Database Configuration
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://user:password@localhost:3306/barrel_delivery"
    )
    DATABASE_POOL_SIZE: int = int(os.getenv("DATABASE_POOL_SIZE", "10"))
    DATABASE_MAX_OVERFLOW: int = int(os.getenv("DATABASE_MAX_OVERFLOW", "20"))
    
    # S3 Configuration
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    S3_BUCKET: str = os.getenv("S3_BUCKET", "barrel-delivery-ml-models")
    S3_PREFIX: str = os.getenv("S3_PREFIX", "models/")
    
    # Model Configuration
    MODEL_TRAINING_DAYS: int = int(os.getenv("MODEL_TRAINING_DAYS", "90"))
    MODEL_RETRAINING_INTERVAL_HOURS: int = int(
        os.getenv("MODEL_RETRAINING_INTERVAL_HOURS", "24")
    )
    MODEL_AUTO_DEPLOY_THRESHOLD: float = float(
        os.getenv("MODEL_AUTO_DEPLOY_THRESHOLD", "0.02")
    )
    MODEL_MAX_VERSIONS_PER_ZONE: int = int(
        os.getenv("MODEL_MAX_VERSIONS_PER_ZONE", "5")
    )
    
    # Feature Configuration
    FEATURE_SCALING_METHOD: str = os.getenv("FEATURE_SCALING_METHOD", "standard")
    FEATURE_ENGINEERING_VERSION: int = int(
        os.getenv("FEATURE_ENGINEERING_VERSION", "1")
    )
    
    # Training Configuration
    TRAIN_TEST_SPLIT: float = float(os.getenv("TRAIN_TEST_SPLIT", "0.15"))
    TRAIN_VAL_SPLIT: float = float(os.getenv("TRAIN_VAL_SPLIT", "0.15"))
    RANDOM_STATE: int = int(os.getenv("RANDOM_STATE", "42"))
    
    # XGBoost Configuration
    XGBOOST_MAX_DEPTH: int = int(os.getenv("XGBOOST_MAX_DEPTH", "6"))
    XGBOOST_LEARNING_RATE: float = float(
        os.getenv("XGBOOST_LEARNING_RATE", "0.1")
    )
    XGBOOST_N_ESTIMATORS: int = int(os.getenv("XGBOOST_N_ESTIMATORS", "200"))
    XGBOOST_SUBSAMPLE: float = float(os.getenv("XGBOOST_SUBSAMPLE", "0.8"))
    XGBOOST_COLSAMPLE_BYTREE: float = float(
        os.getenv("XGBOOST_COLSAMPLE_BYTREE", "0.8")
    )
    
    # LightGBM Configuration
    LIGHTGBM_NUM_LEAVES: int = int(os.getenv("LIGHTGBM_NUM_LEAVES", "31"))
    LIGHTGBM_LEARNING_RATE: float = float(
        os.getenv("LIGHTGBM_LEARNING_RATE", "0.05")
    )
    LIGHTGBM_N_ESTIMATORS: int = int(os.getenv("LIGHTGBM_N_ESTIMATORS", "200"))
    LIGHTGBM_FEATURE_FRACTION: float = float(
        os.getenv("LIGHTGBM_FEATURE_FRACTION", "0.8")
    )
    LIGHTGBM_BAGGING_FRACTION: float = float(
        os.getenv("LIGHTGBM_BAGGING_FRACTION", "0.8")
    )
    
    # Ensemble Configuration
    ENSEMBLE_XGBOOST_WEIGHT: float = float(
        os.getenv("ENSEMBLE_XGBOOST_WEIGHT", "0.5")
    )
    ENSEMBLE_LIGHTGBM_WEIGHT: float = float(
        os.getenv("ENSEMBLE_LIGHTGBM_WEIGHT", "0.5")
    )
    
    # Prediction Interval Configuration
    PREDICTION_INTERVAL_CONFIDENCE: float = float(
        os.getenv("PREDICTION_INTERVAL_CONFIDENCE", "0.95")
    )
    PREDICTION_INTERVAL_METHOD: str = os.getenv(
        "PREDICTION_INTERVAL_METHOD",
        "residual"
    )
    
    # SHAP Configuration
    ENABLE_SHAP_EXPLANATIONS: bool = os.getenv(
        "ENABLE_SHAP_EXPLANATIONS",
        "true"
    ).lower() == "true"
    SHAP_SAMPLE_SIZE: int = int(os.getenv("SHAP_SAMPLE_SIZE", "100"))
    
    # Monitoring
    ENABLE_MONITORING: bool = os.getenv(
        "ENABLE_MONITORING",
        "true"
    ).lower() == "true"
    METRICS_EXPORT_INTERVAL_SECONDS: int = int(
        os.getenv("METRICS_EXPORT_INTERVAL_SECONDS", "300")
    )
    METRICS_RETENTION_DAYS: int = int(
        os.getenv("METRICS_RETENTION_DAYS", "30")
    )
    
    # Performance
    MAX_WORKERS: int = int(os.getenv("MAX_WORKERS", "4"))
    BATCH_PREDICTION_SIZE: int = int(os.getenv("BATCH_PREDICTION_SIZE", "100"))
    CACHE_PREDICTIONS: bool = os.getenv(
        "CACHE_PREDICTIONS",
        "true"
    ).lower() == "true"
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "300"))
    
    @classmethod
    def validate(cls) -> bool:
        """Validate configuration"""
        required_fields = [
            'ML_SERVICE_HOST',
            'ML_SERVICE_PORT',
            'DATABASE_URL'
        ]
        
        for field in required_fields:
            if not getattr(cls, field, None):
                print(f"Missing required configuration: {field}")
                return False
        
        return True
    
    @classmethod
    def to_dict(cls) -> dict:
        """Convert configuration to dictionary"""
        return {
            key: getattr(cls, key)
            for key in dir(cls)
            if not key.startswith('_') and key.isupper()
        }
