"""
Model Versioning Module
Handles model versioning, storage, and rollback
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class ModelVersioning:
    """Handles model versioning and management"""
    
    def __init__(self):
        """Initialize model versioning"""
        self.active_models = {}  # zone_id -> model_id
        self.model_registry = {}  # model_id -> metadata
        self.version_history = {}  # zone_id -> [model_ids]
    
    def register_model(
        self,
        model_id: str,
        zone_id: str,
        model_type: str,
        metrics: Dict[str, float],
        training_date: datetime,
        s3_key: str
    ) -> bool:
        """
        Register a new model version
        
        Args:
            model_id: Unique model identifier
            zone_id: Zone this model is for
            model_type: Type of model (xgboost, lightgbm, ensemble)
            metrics: Model performance metrics
            training_date: When model was trained
            s3_key: S3 location of model file
        
        Returns:
            True if successful
        """
        try:
            metadata = {
                'model_id': model_id,
                'zone_id': zone_id,
                'model_type': model_type,
                'metrics': metrics,
                'training_date': training_date.isoformat(),
                'registered_date': datetime.utcnow().isoformat(),
                's3_key': s3_key,
                'is_active': False,
                'is_production': False,
                'rollback_available': True
            }
            
            self.model_registry[model_id] = metadata
            
            # Add to version history
            if zone_id not in self.version_history:
                self.version_history[zone_id] = []
            self.version_history[zone_id].append(model_id)
            
            logger.info(f"Model {model_id} registered for zone {zone_id}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to register model: {str(e)}")
            return False
    
    def activate_model(
        self,
        model_id: str,
        zone_id: str,
        is_production: bool = False
    ) -> bool:
        """
        Activate a model version
        
        Args:
            model_id: Model to activate
            zone_id: Zone for this model
            is_production: Whether to mark as production
        
        Returns:
            True if successful
        """
        try:
            # Deactivate previous model
            if zone_id in self.active_models:
                prev_model_id = self.active_models[zone_id]
                if prev_model_id in self.model_registry:
                    self.model_registry[prev_model_id]['is_active'] = False
            
            # Activate new model
            if model_id in self.model_registry:
                self.model_registry[model_id]['is_active'] = True
                self.model_registry[model_id]['is_production'] = is_production
                self.model_registry[model_id]['activation_date'] = datetime.utcnow().isoformat()
                self.active_models[zone_id] = model_id
                
                logger.info(f"Model {model_id} activated for zone {zone_id}")
                return True
            else:
                logger.error(f"Model {model_id} not found in registry")
                return False
        
        except Exception as e:
            logger.error(f"Failed to activate model: {str(e)}")
            return False
    
    def rollback(
        self,
        zone_id: str,
        target_version: str
    ) -> Optional[Dict[str, str]]:
        """
        Rollback to a previous model version
        
        Args:
            zone_id: Zone to rollback
            target_version: Target model version
        
        Returns:
            Rollback result with previous and current versions
        """
        try:
            # Get current model
            current_model_id = self.active_models.get(zone_id)
            
            # Check if target version exists and is valid
            if target_version not in self.model_registry:
                logger.error(f"Target version {target_version} not found")
                return None
            
            target_metadata = self.model_registry[target_version]
            if target_metadata['zone_id'] != zone_id:
                logger.error(f"Target version not for zone {zone_id}")
                return None
            
            # Activate target version
            if self.activate_model(target_version, zone_id):
                logger.info(f"Rolled back zone {zone_id} from {current_model_id} to {target_version}")
                return {
                    'previous_version': current_model_id or 'none',
                    'current_version': target_version,
                    'rollback_timestamp': datetime.utcnow().isoformat()
                }
            else:
                logger.error(f"Failed to activate target version {target_version}")
                return None
        
        except Exception as e:
            logger.error(f"Rollback failed: {str(e)}")
            return None
    
    def get_active_model(self, zone_id: str) -> Optional[Dict[str, Any]]:
        """Get active model for a zone"""
        try:
            model_id = self.active_models.get(zone_id)
            if model_id and model_id in self.model_registry:
                return self.model_registry[model_id]
            return None
        except Exception as e:
            logger.error(f"Failed to get active model: {str(e)}")
            return None
    
    def get_model_info(self, zone_id: str, model_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed model information"""
        try:
            if model_id in self.model_registry:
                metadata = self.model_registry[model_id]
                if metadata['zone_id'] == zone_id:
                    return metadata
            return None
        except Exception as e:
            logger.error(f"Failed to get model info: {str(e)}")
            return None
    
    def list_models(self, zone_id: str) -> List[Dict[str, Any]]:
        """List all models for a zone"""
        try:
            models = []
            if zone_id in self.version_history:
                for model_id in self.version_history[zone_id]:
                    if model_id in self.model_registry:
                        models.append(self.model_registry[model_id])
            return models
        except Exception as e:
            logger.error(f"Failed to list models: {str(e)}")
            return []
    
    def get_metrics(
        self,
        model_id: Optional[str] = None,
        zone_id: Optional[str] = None,
        lookback_days: int = 30
    ) -> Optional[Dict[str, Any]]:
        """Get model metrics"""
        try:
            # If model_id provided, use it directly
            if model_id and model_id in self.model_registry:
                metadata = self.model_registry[model_id]
            # If zone_id provided, get active model
            elif zone_id:
                active_model = self.get_active_model(zone_id)
                if not active_model:
                    return None
                metadata = active_model
            else:
                return None
            
            metrics = metadata.get('metrics', {})
            
            return {
                'model_id': metadata['model_id'],
                'mae': metrics.get('mae', 0.0),
                'rmse': metrics.get('rmse', 0.0),
                'mape': metrics.get('mape', 0.0),
                'pi_coverage': metrics.get('pi_coverage', 0.0),
                'pi_width': metrics.get('pi_width', 0.0),
                'validation_date': metadata.get('registered_date', ''),
                'training_samples': metadata.get('training_samples', 0)
            }
        
        except Exception as e:
            logger.error(f"Failed to get metrics: {str(e)}")
            return None
    
    def load_active_models(self) -> bool:
        """Load all active models (called on startup)"""
        try:
            logger.info("Loading active models...")
            # This would load models from S3 in production
            # For now, just log
            active_count = len(self.active_models)
            logger.info(f"Loaded {active_count} active models")
            return True
        except Exception as e:
            logger.error(f"Failed to load active models: {str(e)}")
            return False
    
    def cleanup(self) -> bool:
        """Cleanup resources (called on shutdown)"""
        try:
            logger.info("Cleaning up model versioning...")
            # This would unload models and cleanup resources
            self.active_models.clear()
            logger.info("Cleanup completed")
            return True
        except Exception as e:
            logger.error(f"Cleanup failed: {str(e)}")
            return False
    
    def get_active_models_count(self) -> int:
        """Get count of active models"""
        return len(self.active_models)
    
    def get_version_history(self, zone_id: str) -> List[Dict[str, Any]]:
        """Get version history for a zone"""
        try:
            history = []
            if zone_id in self.version_history:
                for model_id in reversed(self.version_history[zone_id]):
                    if model_id in self.model_registry:
                        history.append(self.model_registry[model_id])
            return history
        except Exception as e:
            logger.error(f"Failed to get version history: {str(e)}")
            return []
    
    def compare_models(self, model_id1: str, model_id2: str) -> Optional[Dict[str, Any]]:
        """Compare two models"""
        try:
            if model_id1 not in self.model_registry or model_id2 not in self.model_registry:
                return None
            
            m1 = self.model_registry[model_id1]
            m2 = self.model_registry[model_id2]
            
            metrics1 = m1.get('metrics', {})
            metrics2 = m2.get('metrics', {})
            
            comparison = {
                'model_1': {
                    'id': model_id1,
                    'type': m1.get('model_type'),
                    'mae': metrics1.get('mae'),
                    'rmse': metrics1.get('rmse'),
                    'mape': metrics1.get('mape')
                },
                'model_2': {
                    'id': model_id2,
                    'type': m2.get('model_type'),
                    'mae': metrics2.get('mae'),
                    'rmse': metrics2.get('rmse'),
                    'mape': metrics2.get('mape')
                },
                'winner': self._determine_winner(metrics1, metrics2)
            }
            
            return comparison
        
        except Exception as e:
            logger.error(f"Failed to compare models: {str(e)}")
            return None
    
    def _determine_winner(self, metrics1: Dict, metrics2: Dict) -> str:
        """Determine which model is better"""
        mae1 = metrics1.get('mae', float('inf'))
        mae2 = metrics2.get('mae', float('inf'))
        
        if mae1 < mae2:
            return 'model_1'
        elif mae2 < mae1:
            return 'model_2'
        else:
            return 'tie'
