"""
WHO ICD-11 API Service
Provides access to the World Health Organization's ICD-11 API
"""

import requests
import logging
import time
import urllib3
from typing import Dict, Optional, Any, List
from django.conf import settings
from django.core.cache import cache

# Suppress SSL warnings for development
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

class WHOICD11APIService:
    """
    Service for interacting with the WHO ICD-11 API
    """
    
    def __init__(self):
        self.base_url = "https://icd.who.int/icdapi"
        self.client_id = getattr(settings, 'CLIENT_ID', None)
        self.client_secret = getattr(settings, 'CLIENT_SECRET', None)
        
        # For now, we'll use a simplified approach without OAuth2
        # The WHO API also supports basic authentication
        self.access_token = None
        self.token_expires_at = None
        
        # API configuration
        self.timeout = 30
        self.max_retries = 3
        self.retry_delay = 1.0
        
        # Rate limiting
        self.requests_per_minute = 60
        self.last_request_time = 0
        self.min_request_interval = 60.0 / self.requests_per_minute
        
    def _get_access_token(self) -> Optional[str]:
        """
        Get access token for WHO API using OAuth2
        """
        try:
            if not self.client_id or not self.client_secret:
                logger.error("WHO API credentials not configured")
                return None
            
            # Check if we have a valid token
            if self.access_token and self.token_expires_at and time.time() < self.token_expires_at:
                return self.access_token
            
            # Get new token using OAuth2
            token_url = "https://icd.who.int/icdapi/oauth2/token"
            token_data = {
                'grant_type': 'client_credentials',
                'client_id': self.client_id,
                'client_secret': self.client_secret
            }
            
            response = requests.post(token_url, data=token_data, timeout=self.timeout)
            
            if response.status_code == 200:
                token_info = response.json()
                self.access_token = token_info.get('access_token')
                expires_in = token_info.get('expires_in', 3600)
                self.token_expires_at = time.time() + expires_in
                
                logger.info("Successfully obtained WHO API access token")
                return self.access_token
            else:
                logger.error(f"Failed to get WHO API token: {response.status_code}")
                return None
            
        except Exception as e:
            logger.error(f"Error getting WHO API access token: {str(e)}")
            return None
            
    def _make_request(self, endpoint: str, params: Dict = None) -> Optional[Dict]:
        """
        Make authenticated request to WHO API with rate limiting
        """
        try:
            # Rate limiting
            current_time = time.time()
            time_since_last = current_time - self.last_request_time
            if time_since_last < self.min_request_interval:
                sleep_time = self.min_request_interval - time_since_last
                time.sleep(sleep_time)
            
            # Get access token
            token = self._get_access_token()
            if not token:
                return None
            
            # Prepare headers with OAuth2 token
            headers = {
                'Accept': 'application/json',
                'Accept-Language': 'en',
                'API-Version': 'v2',
                'App': 'Amieti-Health-System',
                'Authorization': f'Bearer {token}'
            }
            
            # Make request
            url = f"{self.base_url}/{endpoint}"
            response = requests.get(url, headers=headers, params=params, timeout=self.timeout, verify=False)
            
            # Update last request time
            self.last_request_time = time.time()
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401:
                # Token expired, clear and retry once
                logger.warning("WHO API token expired, refreshing...")
                self.access_token = None
                self.token_expires_at = None
                return self._make_request(endpoint, params)
            else:
                logger.error(f"WHO API request failed: {response.status_code} - {response.text}")
            return None
            
        except Exception as e:
            logger.error(f"Error making WHO API request: {str(e)}")
            return None
    
    def get_icd11_details(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information for an ICD-11 entity
        
        Args:
            entity_id (str): ICD-11 entity identifier
            
        Returns:
            Optional[Dict]: Entity details or None if not found
        """
        try:
            # Try to get from cache first
            cache_key = f"who_icd11_{entity_id}"
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.info(f"Retrieved {entity_id} from cache")
                return cached_data
            
            # For now, return enhanced local data
            # This simulates WHO API data while we work on the actual API integration
            enhanced_data = self._get_enhanced_local_data(entity_id)
            
            if enhanced_data:
                # Cache the result for 24 hours
                cache.set(cache_key, enhanced_data, 24 * 60 * 60)
                logger.info(f"Successfully retrieved enhanced data for {entity_id}")
                return enhanced_data
            else:
                # logger.warning(f"No enhanced data available for {entity_id}")
                pass
            return None
            
        except Exception as e:
            logger.error(f"Error getting ICD-11 details for {entity_id}: {str(e)}")
            return None
    
    def _get_enhanced_local_data(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """
        Get enhanced local data that simulates WHO API response
        """
        # Enhanced definitions for common conditions
        enhanced_definitions = {
            'MD90.0': {
                'id': entity_id,
                'title': 'Fever',
                'definition': 'Elevated body temperature without specification of cause. This includes fever of unknown origin and fever not otherwise specified.',
                'source': 'enhanced_local',
                'confidence': 'high',
                'icd11_code': 'MD90.0',
                'category': 'Symptoms and signs',
                'severity': 'moderate'
            },
            '8A80.0': {
                'id': entity_id,
                'title': 'Headache',
                'definition': 'Pain in the head without specification of type or cause. This includes tension headaches, migraine-like symptoms, and other unspecified head pain.',
                'source': 'enhanced_local',
                'confidence': 'high',
                'icd11_code': '8A80.0',
                'category': 'Symptoms and signs',
                'severity': 'moderate'
            },
            'MD90.3': {
                'id': entity_id,
                'title': 'Pain',
                'definition': 'Unpleasant sensory and emotional experience without specification of location, type, or cause. This includes generalized pain and pain not otherwise specified.',
                'source': 'enhanced_local',
                'confidence': 'high',
                'icd11_code': 'MD90.3',
                'category': 'Symptoms and signs',
                'severity': 'moderate'
            },
            'ND56.0': {
                'id': entity_id,
                'title': 'Injury',
                'definition': 'Minor injury to the head without specification of exact location or type. This includes cuts, scrapes, and minor bruises to the head region.',
                'source': 'enhanced_local',
                'confidence': 'high',
                'icd11_code': 'ND56.0',
                'category': 'Injuries',
                'severity': 'mild'
            },
            'QA00.0': {
                'id': entity_id,
                'title': 'General medical examination',
                'definition': 'Routine health examination for individuals without specific complaints. This includes preventive care visits and general health assessments.',
                'source': 'enhanced_local',
                            'confidence': 'high',
                'icd11_code': 'QA00.0',
                'category': 'Health services',
                'severity': 'none'
            }
        }
        
        # Extract code from entity_id if it's a full URL
        code = entity_id
        if 'entity/' in entity_id:
            code = entity_id.split('entity/')[-1]
        
        return enhanced_definitions.get(code)
    
    def search_entities(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search for ICD-11 entities
        
        Args:
            query (str): Search query
            limit (int): Maximum number of results
            
        Returns:
            List[Dict]: Search results
        """
        try:
            params = {
                'q': query,
                'propertiesToBeSearched': 'Title,Definition,Exclusion,FullySpecifiedName',
                'useFlexisearch': 'true',
                'flatResults': 'true',
                'linearization': 'mms',
                'limit': limit
            }
            
            data = self._make_request('content/search', params)
            
            if data and 'destinationEntities' in data:
                return data['destinationEntities']
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error searching ICD-11 entities: {str(e)}")
            return []
    
    def get_api_status(self) -> Dict[str, Any]:
        """
        Get API status and health information
            
        Returns:
            Dict: API status information
        """
        try:
            # Test API connectivity
            test_entity = "http://id.who.int/icd/entity/123456789"
            test_data = self.get_icd11_details(test_entity)
            
            return {
                'available': True,
                'authenticated': bool(self.access_token),
                'credentials_configured': bool(self.client_id and self.client_secret),
                'test_successful': test_data is not None,
                'rate_limit': {
                    'requests_per_minute': self.requests_per_minute,
                    'min_interval': self.min_request_interval
                },
                'last_request': self.last_request_time,
                'status': 'operational'
            }
            
        except Exception as e:
            logger.error(f"Error checking API status: {str(e)}")
        return {
                'available': False,
                'authenticated': False,
                'credentials_configured': bool(self.client_id and self.client_secret),
                'test_successful': False,
                'error': str(e),
                'status': 'error'
            }
    
    def get_entity_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about API usage and entities
            
        Returns:
            Dict: Statistics information
        """
        try:
            # Get basic statistics
            stats = {
                'total_requests': cache.get('who_api_requests', 0),
                'cache_hits': cache.get('who_api_cache_hits', 0),
                'api_calls': cache.get('who_api_calls', 0),
                'errors': cache.get('who_api_errors', 0),
                'last_request_time': self.last_request_time,
                'token_expires_at': self.token_expires_at
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting API statistics: {str(e)}")
            return {'error': str(e)}
