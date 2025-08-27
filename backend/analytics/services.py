"""
Optimized ICD-11 Services with Rate Limiting and Retries
Provides a robust hybrid system with local caching and WHO API fallback
"""

import time
import logging
import json
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from .models import ICD11Entity
from .icd11_service import ICD11Detector
from .icd11_api_service import WHOICD11APIService

logger = logging.getLogger(__name__)

class ICD11ServiceManager:
    """
    Optimized service manager for ICD-11 operations with rate limiting and retries
    """
    
    def __init__(self):
        self.local_detector = ICD11Detector()
        self.who_api_service = WHOICD11APIService()
        
        # Rate limiting configuration
        self.rate_limit_delay = 0.5  # 500ms between requests
        self.max_retries = 3
        self.retry_delay = 1.0  # 1 second base delay
        
        # Cache configuration
        self.cache_timeout = 24 * 60 * 60  # 24 hours
        self.local_cache_timeout = 7 * 24 * 60 * 60  # 7 days
        
        # API status tracking
        self.api_failure_count = 0
        self.max_api_failures = 10
        self.api_cooldown_until = None
        
    def get_icd11_data(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """
        Get ICD-11 data with optimized caching and fallback strategy
        
        Args:
            entity_id (str): ICD-11 entity identifier
            
        Returns:
            Optional[Dict]: ICD-11 data or None if not found
        """
        try:
            # 1. Check local database cache first
            local_data = self._get_from_local_cache(entity_id)
            if local_data:
                logger.info(f"Retrieved {entity_id} from local cache")
                return local_data
            
            # 2. Check if API is available and not in cooldown
            if not self._is_api_available():
                # logger.warning(f"API unavailable for {entity_id}, using fallback")
                return self._get_fallback_data(entity_id)
            
            # 3. Fetch from WHO API with rate limiting and retries
            api_data = self._fetch_from_who_api_with_retry(entity_id)
            if api_data:
                # Cache the result
                self._cache_locally(entity_id, api_data)
                return api_data
            
            # 4. Fallback to local detection
            # logger.warning(f"No API data for {entity_id}, using local fallback")
            return self._get_fallback_data(entity_id)
            
        except Exception as e:
            logger.error(f"Error getting ICD-11 data for {entity_id}: {str(e)}")
            return self._get_fallback_data(entity_id)
    
    def _get_from_local_cache(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Get data from local PostgreSQL cache"""
        try:
            entity = ICD11Entity.objects.filter(
                entity_id=entity_id,
                is_active=True
            ).first()
            
            if entity and not entity.is_stale:
                return entity.json_data
            
            return None
        except Exception as e:
            logger.error(f"Error accessing local cache for {entity_id}: {str(e)}")
            return None
    
    def _cache_locally(self, entity_id: str, data: Dict[str, Any]) -> bool:
        """Cache data in local PostgreSQL database"""
        try:
            with transaction.atomic():
                entity, created = ICD11Entity.objects.update_or_create(
                    entity_id=entity_id,
                    defaults={
                        'json_data': data,
                        'is_active': True
                    }
                )
            
            action = 'Created' if created else 'Updated'
            logger.info(f"{action} local cache for {entity_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error caching data for {entity_id}: {str(e)}")
            return False
    
    def _is_api_available(self) -> bool:
        """Check if WHO API is available and not in cooldown"""
        # Check cooldown period
        if self.api_cooldown_until and timezone.now() < self.api_cooldown_until:
            return False
        
        # Check failure count
        if self.api_failure_count >= self.max_api_failures:
            # Set cooldown period
            self.api_cooldown_until = timezone.now() + timedelta(minutes=30)
            self.api_failure_count = 0
            # logger.warning("API failure limit reached, entering cooldown period")
            return False
        
        # Check if API service is properly configured
        if not self.who_api_service:
            return False
        
        # Check if credentials are available
        if not self.who_api_service.client_id or not self.who_api_service.client_secret:
            # logger.warning("WHO API credentials not configured")
            return False
        
        return True
    
    def _fetch_from_who_api_with_retry(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Fetch data from WHO API with retry logic and rate limiting"""
        for attempt in range(self.max_retries):
            try:
                # Rate limiting
                if attempt > 0:
                    delay = self.retry_delay * (2 ** attempt)  # Exponential backoff
                    time.sleep(delay)
                else:
                    time.sleep(self.rate_limit_delay)
                
                # Fetch data
                data = self.who_api_service.get_icd11_details(entity_id)
                
                if data:
                    # Reset failure count on success
                    self.api_failure_count = 0
                    logger.info(f"Successfully fetched {entity_id} from WHO API")
                    return data
                else:
                    # logger.warning(f"No data returned for {entity_id} (attempt {attempt + 1})")
                    
            except Exception as e:
                self.api_failure_count += 1
                logger.error(f"API error for {entity_id} (attempt {attempt + 1}): {str(e)}")
                
                if attempt == self.max_retries - 1:
                    logger.error(f"All retry attempts failed for {entity_id}")
                    return None
        
        return None
    
    def _get_fallback_data(self, entity_id: str) -> Dict[str, Any]:
        """Get fallback data when API is unavailable"""
        # Try to get from local detector mappings
        for condition, data in self.local_detector.condition_mappings.items():
            if data['code'] == entity_id:
                return {
                    'id': entity_id,
                    'title': data['name'],
                    'definition': f"Local mapping for {data['name']}",
                    'source': 'local_fallback',
                    'confidence': 'medium'
                }
        
        # Generic fallback
        return {
            'id': entity_id,
            'title': f'ICD-11 Code: {entity_id}',
            'definition': 'Data temporarily unavailable',
            'source': 'generic_fallback',
            'confidence': 'low'
        }
    
    def detect_conditions(self, text: str) -> List[Dict[str, Any]]:
        """
        Detect medical conditions with hybrid approach
        
        Args:
            text (str): Text to analyze
            
        Returns:
            List[Dict]: Detected conditions
        """
        try:
            # Use local detection first (fast and reliable)
            local_conditions = self.local_detector.detect_conditions(text)
            
            # Enhance with API data if available
            enhanced_conditions = []
            for condition in local_conditions:
                enhanced_condition = condition.copy()
                
                # Try to get additional data from API
                if self._is_api_available():
                    api_data = self.get_icd11_data(condition['icd11_code'])
                    if api_data and api_data.get('source') != 'generic_fallback':
                        enhanced_condition.update({
                            'api_data': api_data,
                            'source': 'hybrid',
                            'enhanced': True
                        })
                    else:
                        enhanced_condition['source'] = 'local'
                        enhanced_condition['enhanced'] = False
                else:
                    enhanced_condition['source'] = 'local'
                    enhanced_condition['enhanced'] = False
                
                enhanced_conditions.append(enhanced_condition)
            
            return enhanced_conditions
            
        except Exception as e:
            logger.error(f"Error detecting conditions: {str(e)}")
            # Fallback to local detection only
            return self.local_detector.detect_conditions(text)
    
    def get_condition_details(self, condition_code: str) -> Dict[str, Any]:
        """
        Get detailed information for a specific condition code
        
        Args:
            condition_code (str): ICD-11 condition code
            
        Returns:
            Dict: Detailed condition information
        """
        try:
            # Try to get from hybrid system first
            hybrid_data = self.get_icd11_data(condition_code)
            if hybrid_data and hybrid_data.get('source') != 'generic_fallback':
                return {
                    'code': condition_code,
                    'name': hybrid_data.get('title', ''),
                    'definition': hybrid_data.get('definition', ''),
                    'source': 'hybrid',
                    'api_data': hybrid_data
                }
            
            # Fallback to local data
            local_data = self.local_detector.condition_mappings.get(condition_code, {})
            if local_data:
                return {
                    'code': condition_code,
                    'name': local_data.get('name', ''),
                    'definition': f"Local mapping for {local_data.get('name', '')}",
                    'source': 'local'
                }
            
            # Generic fallback
            return {
                'code': condition_code,
                'name': f'ICD-11 Code: {condition_code}',
                'definition': 'Data temporarily unavailable',
                'source': 'generic_fallback'
            }
            
        except Exception as e:
            logger.error(f"Error getting condition details for {condition_code}: {str(e)}")
            return {
                'code': condition_code,
                'name': f'ICD-11 Code: {condition_code}',
                'definition': 'Error retrieving data',
                'source': 'error'
            }
    
    def refresh_stale_entities(self, limit: int = 50) -> Dict[str, int]:
        """
        Refresh stale entities in the cache
        
        Args:
            limit (int): Maximum number of entities to refresh
            
        Returns:
            Dict: Refresh statistics
        """
        try:
            stale_entities = ICD11Entity.objects.filter(
                is_active=True
            ).filter(
                last_updated__lt=timezone.now() - timedelta(days=7)
            )[:limit]
            
            refreshed_count = 0
            failed_count = 0
            
            for entity in stale_entities:
                try:
                    # Check if API is available
                    if not self._is_api_available():
                        logger.warning("API unavailable during refresh, skipping")
                        break
                    
                    # Fetch fresh data
                    api_data = self._fetch_from_who_api_with_retry(entity.entity_id)
                    if api_data:
                        entity.json_data = api_data
                        entity.save()
                        refreshed_count += 1
                        logger.info(f"Refreshed {entity.entity_id}")
                    else:
                        failed_count += 1
                        logger.warning(f"Failed to refresh {entity.entity_id}")
                    
                    # Rate limiting
                    time.sleep(self.rate_limit_delay)
                    
                except Exception as e:
                    failed_count += 1
                    logger.error(f"Error refreshing {entity.entity_id}: {str(e)}")
            
            return {
                'refreshed': refreshed_count,
                'failed': failed_count,
                'total_processed': refreshed_count + failed_count
            }
            
        except Exception as e:
            logger.error(f"Error during entity refresh: {str(e)}")
            return {'refreshed': 0, 'failed': 0, 'total_processed': 0}
    
    def get_service_status(self) -> Dict[str, Any]:
        """Get comprehensive service status"""
        try:
            # Database statistics
            total_entities = ICD11Entity.objects.count()
            active_entities = ICD11Entity.objects.filter(is_active=True).count()
            stale_entities = ICD11Entity.objects.filter(
                last_updated__lt=timezone.now() - timedelta(days=7)
            ).count()
            
            # API status
            api_status = self.who_api_service.get_api_status()
            
            # Cache statistics
            cache_stats = {
                'api_calls': cache.get('icd11_api_calls', 0),
                'local_hits': cache.get('icd11_local_hits', 0),
                'hybrid_hits': cache.get('icd11_hybrid_hits', 0),
                'fallback_hits': cache.get('icd11_fallback_hits', 0)
            }
            
            # Performance metrics
            performance_metrics = {
                'api_available': self._is_api_available(),
                'api_failure_count': self.api_failure_count,
                'api_cooldown_active': bool(self.api_cooldown_until and timezone.now() < self.api_cooldown_until),
                'rate_limit_delay': self.rate_limit_delay,
                'max_retries': self.max_retries
            }
            
            return {
                'database_stats': {
                    'total_entities': total_entities,
                    'active_entities': active_entities,
                    'stale_entities': stale_entities
                },
                'api_status': api_status,
                'cache_stats': cache_stats,
                'performance_metrics': performance_metrics,
                'rate_limiting': {
                    'delay': self.rate_limit_delay,
                    'max_retries': self.max_retries,
                    'retry_delay': self.retry_delay
                },
                'last_updated': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting service status: {str(e)}")
            return {'error': str(e)}
    
    def cleanup_inactive_entities(self, days_old: int = 30) -> int:
        """
        Clean up inactive entities older than specified days
        
        Args:
            days_old (int): Age threshold for cleanup
            
        Returns:
            int: Number of entities cleaned up
        """
        try:
            cutoff_date = timezone.now() - timedelta(days=days_old)
            inactive_entities = ICD11Entity.objects.filter(
                is_active=False,
                last_updated__lt=cutoff_date
            )
            
            count = inactive_entities.count()
            inactive_entities.delete()
            
            logger.info(f"Cleaned up {count} inactive entities")
            return count
            
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            return 0

# Global service instance
icd11_service = ICD11ServiceManager()
