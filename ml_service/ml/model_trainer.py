"""
Model Training Module
Handles training of XGBoost and LightGBM models
"""

import xgboost as xgb
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib
import logging
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
import uuid
import json

logger = logging.getLogger(__name__)


class ModelTrainer:
    """Handles model training and management"""
    
    def __init__(self):
        """Initialize model trainer"""
        self.training_jobs = {}
        self.scaler = StandardScaler()
    
    def train_async(
        self,
        zone_id: str,
        lookback_days: int = 90,
        force_retrain: bool = False
    ) -> Dict[str, Any]:
        """
        Start asynchronous training job
        
        Args:
            zone_id: Zone to train for
            lookback_days: Days of historical data to use
            force_retrain: Force retraining even if recent model exists
        
        Returns:
            Job information with model_id and status
        """
        job_id = str(uuid.uuid4())
        
        self.training_jobs[job_id] = {
            'model_id': f"v{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{job_id[:8]}",
            'zone_id': zone_id,
            'status': 'queued',
            'created_at': datetime.utcnow().isoformat(),
            'lookback_days': lookback_days,
            'force_retrain': force_retrain
        }
        
        logger.info(f"Training job {job_id} queued for zone {zone_id}")
        
        return {
            'model_id': self.training_jobs[job_id]['model_id'],
            'status': 'queued',
            'eta_seconds': 300  # Estimated 5 minutes
        }
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get status of training job"""
        return self.training_jobs.get(job_id)
    
    def train_xgboost(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        feature_names: list
    ) -> Tuple[xgb.XGBRegressor, Dict[str, float]]:
        """
        Train XGBoost model
        
        Args:
            X_train: Training features
            y_train: Training targets
            X_val: Validation features
            y_val: Validation targets
            feature_names: Feature names for model
        
        Returns:
            Trained model and metrics
        """
        logger.info("Training XGBoost model...")
        
        model = xgb.XGBRegressor(
            max_depth=6,
            learning_rate=0.1,
            n_estimators=200,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            objective='reg:squarederror',
            eval_metric='mae'
        )
        
        # Train with early stopping
        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            early_stopping_rounds=20,
            verbose=False
        )
        
        # Calculate metrics
        y_pred = model.predict(X_val)
        mae = mean_absolute_error(y_val, y_pred)
        rmse = np.sqrt(mean_squared_error(y_val, y_pred))
        mape = np.mean(np.abs((y_val - y_pred) / (y_val + 1))) * 100
        
        logger.info(f"XGBoost - MAE: {mae:.4f}, RMSE: {rmse:.4f}, MAPE: {mape:.2f}%")
        
        return model, {
            'mae': mae,
            'rmse': rmse,
            'mape': mape,
            'n_estimators': model.n_estimators
        }
    
    def train_lightgbm(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        feature_names: list
    ) -> Tuple[lgb.LGBMRegressor, Dict[str, float]]:
        """
        Train LightGBM model
        
        Args:
            X_train: Training features
            y_train: Training targets
            X_val: Validation features
            y_val: Validation targets
            feature_names: Feature names for model
        
        Returns:
            Trained model and metrics
        """
        logger.info("Training LightGBM model...")
        
        model = lgb.LGBMRegressor(
            num_leaves=31,
            learning_rate=0.05,
            n_estimators=200,
            feature_fraction=0.8,
            bagging_fraction=0.8,
            bagging_freq=5,
            random_state=42,
            verbose=-1
        )
        
        # Train with early stopping
        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            early_stopping_rounds=20,
            verbose=False
        )
        
        # Calculate metrics
        y_pred = model.predict(X_val)
        mae = mean_absolute_error(y_val, y_pred)
        rmse = np.sqrt(mean_squared_error(y_val, y_pred))
        mape = np.mean(np.abs((y_val - y_pred) / (y_val + 1))) * 100
        
        logger.info(f"LightGBM - MAE: {mae:.4f}, RMSE: {rmse:.4f}, MAPE: {mape:.2f}%")
        
        return model, {
            'mae': mae,
            'rmse': rmse,
            'mape': mape,
            'n_estimators': model.n_estimators
        }
    
    def train_ensemble(
        self,
        xgb_model: xgb.XGBRegressor,
        lgb_model: lgb.LGBMRegressor,
        X_val: np.ndarray,
        y_val: np.ndarray,
        xgb_weight: float = 0.5,
        lgb_weight: float = 0.5
    ) -> Tuple[Dict[str, Any], Dict[str, float]]:
        """
        Create ensemble model from XGBoost and LightGBM
        
        Args:
            xgb_model: Trained XGBoost model
            lgb_model: Trained LightGBM model
            X_val: Validation features
            y_val: Validation targets
            xgb_weight: Weight for XGBoost predictions
            lgb_weight: Weight for LightGBM predictions
        
        Returns:
            Ensemble model info and metrics
        """
        logger.info("Creating ensemble model...")
        
        # Get predictions from both models
        xgb_pred = xgb_model.predict(X_val)
        lgb_pred = lgb_model.predict(X_val)
        
        # Weighted average
        ensemble_pred = (xgb_weight * xgb_pred + lgb_weight * lgb_pred) / (xgb_weight + lgb_weight)
        
        # Calculate metrics
        mae = mean_absolute_error(y_val, ensemble_pred)
        rmse = np.sqrt(mean_squared_error(y_val, ensemble_pred))
        mape = np.mean(np.abs((y_val - ensemble_pred) / (y_val + 1))) * 100
        
        logger.info(f"Ensemble - MAE: {mae:.4f}, RMSE: {rmse:.4f}, MAPE: {mape:.2f}%")
        
        ensemble_info = {
            'type': 'ensemble',
            'xgb_weight': xgb_weight,
            'lgb_weight': lgb_weight,
            'models': ['xgboost', 'lightgbm']
        }
        
        return ensemble_info, {
            'mae': mae,
            'rmse': rmse,
            'mape': mape
        }
    
    def calculate_prediction_intervals(
        self,
        model: Any,
        X_val: np.ndarray,
        y_val: np.ndarray,
        confidence: float = 0.95
    ) -> Dict[str, Any]:
        """
        Calculate prediction intervals using residual analysis
        
        Args:
            model: Trained model
            X_val: Validation features
            y_val: Validation targets
            confidence: Confidence level (0.95 = 95%)
        
        Returns:
            Prediction interval parameters
        """
        y_pred = model.predict(X_val)
        residuals = y_val - y_pred
        
        # Calculate residual statistics
        residual_std = np.std(residuals)
        residual_mean = np.mean(residuals)
        
        # Z-score for confidence level
        from scipy import stats
        z_score = stats.norm.ppf((1 + confidence) / 2)
        
        return {
            'residual_std': float(residual_std),
            'residual_mean': float(residual_mean),
            'z_score': float(z_score),
            'interval_width': float(2 * z_score * residual_std),
            'coverage_target': confidence
        }
    
    def prepare_training_data(
        self,
        features_df: pd.DataFrame,
        target_df: pd.DataFrame,
        test_size: float = 0.15,
        val_size: float = 0.15
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Prepare training, validation, and test data
        
        Args:
            features_df: Feature dataframe
            target_df: Target dataframe
            test_size: Fraction for test set
            val_size: Fraction for validation set
        
        Returns:
            X_train, y_train, X_val, y_val, X_test, y_test
        """
        # Split into train+val and test
        X_temp, X_test, y_temp, y_test = train_test_split(
            features_df, target_df,
            test_size=test_size,
            random_state=42
        )
        
        # Split train+val into train and val
        val_size_adjusted = val_size / (1 - test_size)
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp,
            test_size=val_size_adjusted,
            random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        X_test_scaled = self.scaler.transform(X_test)
        
        return (
            X_train_scaled, y_train.values,
            X_val_scaled, y_val.values,
            X_test_scaled, y_test.values
        )
    
    def save_model(self, model: Any, path: str) -> bool:
        """Save trained model to disk"""
        try:
            joblib.dump(model, path)
            logger.info(f"Model saved to {path}")
            return True
        except Exception as e:
            logger.error(f"Failed to save model: {str(e)}")
            return False
    
    def load_model(self, path: str) -> Optional[Any]:
        """Load trained model from disk"""
        try:
            model = joblib.load(path)
            logger.info(f"Model loaded from {path}")
            return model
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            return None
