"""
ICD-11 Detection Service for Physical Health Analytics
Uses imported ICD-11 data from database for local detection
"""

import re
import requests
import json
from typing import List, Dict, Tuple
from django.conf import settings
from django.db.models import Q
from analytics.models import ICD11Mapping, ICD11Entity
import logging

logger = logging.getLogger(__name__)

class ICD11Detector:
    """
    Service for detecting ICD-11 medical conditions from text using database mappings
    """
    
    def __init__(self):
        # Load mappings from database
        self._load_database_mappings()
        
        # Fallback mappings for common conditions (if not in database)
        self.fallback_mappings = {
            'fever': {'code': 'MD90.0', 'name': 'Fever'},
            'headache': {'code': '8A80.0', 'name': 'Headache'},
            'cough': {'code': 'MD90.0', 'name': 'Cough'},
            'stomach pain': {'code': 'DA92.0', 'name': 'Abdominal pain'},
            'injury': {'code': 'ND56.0', 'name': 'Injury'},
        }
    
    def _load_database_mappings(self):
        """
        Load ICD-11 mappings from the database
        """
        try:
            # Get all active mappings from database
            self.db_mappings = {}
            mappings = ICD11Mapping.objects.filter(is_active=True).values(
                'code', 'description', 'local_terms', 'confidence_score', 'source'
            )
            
            for mapping in mappings:
                code = mapping['code']
                description = mapping['description']
                
                # Store the mapping
                self.db_mappings[code] = {
                    'code': code,
                    'name': description,
                    'local_terms': mapping['local_terms'],
                    'confidence_score': mapping['confidence_score'],
                    'source': mapping['source']
                }
                
                # Create search terms from description and local terms
                search_terms = [description.lower()]
                
                # Add local terms if available
                if mapping['local_terms']:
                    local_terms = mapping['local_terms']
                    if isinstance(local_terms, dict):
                        # Add English terms
                        if 'english' in local_terms and local_terms['english']:
                            search_terms.extend([term.lower() for term in local_terms['english']])
                        # Add Tagalog terms
                        if 'tagalog' in local_terms and local_terms['tagalog']:
                            search_terms.extend([term.lower() for term in local_terms['tagalog']])
                        # Add Taglish terms
                        if 'taglish' in local_terms and local_terms['taglish']:
                            search_terms.extend([term.lower() for term in local_terms['taglish']])
                
                # Create word mappings for each search term, but be more selective
                for term in search_terms:
                    # Only create mappings for meaningful medical terms
                    if self._is_meaningful_medical_term(term):
                        words = re.findall(r'\b\w+\b', term)
                        for word in words:
                            if len(word) > 3 and self._is_medical_word(word):  # Only map words longer than 3 chars
                                if word not in self.db_mappings:
                                    self.db_mappings[word] = {
                                        'code': code,
                                        'name': description,
                                        'confidence_score': mapping['confidence_score'],
                                        'source': mapping['source']
                                    }
            
            logger.info(f"Loaded {len(self.db_mappings)} ICD-11 mappings from database")
            
        except Exception as e:
            logger.error(f"Error loading database mappings: {str(e)}")
            self.db_mappings = {}
    
    def _is_meaningful_medical_term(self, term: str) -> bool:
        """
        Check if a term is meaningful for medical detection
        """
        # Skip very short terms
        if len(term) < 4:
            return False
        
        # Skip common non-medical words
        non_medical_words = {
            'and', 'the', 'for', 'with', 'from', 'this', 'that', 'other', 'unspecified',
            'due', 'not', 'elsewhere', 'classified', 'disorder', 'condition', 'disease',
            'syndrome', 'infection', 'injury', 'pain', 'fever', 'headache', 'cough'
        }
        
        if term.lower() in non_medical_words:
            return False
        
        # Skip terms that are too generic
        generic_patterns = [
            r'^[a-z]+\s+[a-z]+$',  # Two word patterns that are too generic
            r'^[a-z]+\s+[a-z]+\s+[a-z]+$',  # Three word patterns
        ]
        
        for pattern in generic_patterns:
            if re.match(pattern, term.lower()):
                return False
        
        return True
    
    def _is_medical_word(self, word: str) -> bool:
        """
        Check if a word is likely to be medical
        """
        # Medical word patterns
        medical_patterns = [
            r'^[a-z]+itis$',  # -itis words (inflammation)
            r'^[a-z]+osis$',  # -osis words (condition)
            r'^[a-z]+emia$',  # -emia words (blood)
            r'^[a-z]+algia$',  # -algia words (pain)
            r'^[a-z]+rrh[ae]a$',  # -rrhea words (flow)
            r'^[a-z]+plegia$',  # -plegia words (paralysis)
            r'^[a-z]+trophy$',  # -trophy words (growth)
            r'^[a-z]+pathy$',  # -pathy words (disease)
        ]
        
        for pattern in medical_patterns:
            if re.match(pattern, word.lower()):
                return True
        
        # Common medical words
        medical_words = {
            'fever', 'pain', 'headache', 'cough', 'cold', 'flu', 'infection',
            'injury', 'wound', 'cut', 'bruise', 'sprain', 'strain', 'fracture',
            'rash', 'itch', 'swelling', 'nausea', 'vomiting', 'diarrhea',
            'dizziness', 'fatigue', 'weakness', 'sore', 'throat', 'ear',
            'eye', 'nose', 'mouth', 'tooth', 'dental', 'skin', 'bone',
            'muscle', 'joint', 'blood', 'heart', 'lung', 'stomach', 'liver',
            'kidney', 'brain', 'nerve', 'vessel', 'gland', 'tumor', 'cancer',
            'allergy', 'asthma', 'diabetes', 'hypertension', 'arthritis',
            'migraine', 'seizure', 'stroke', 'attack', 'shock', 'trauma'
        }
        
        return word.lower() in medical_words
    
    def detect_conditions(self, text: str) -> List[Dict[str, str]]:
        """
        Detect medical conditions from text using database mappings
        
        Args:
            text (str): Text to analyze (appointment documentation, permit request reasons)
            
        Returns:
            List[Dict]: List of detected conditions with ICD-11 codes
        """
        if not text or not text.strip():
            return []
        
        text_lower = text.lower().strip()
        detected_conditions = []
        
        # First, try database mappings
        detected_conditions.extend(self._detect_from_database(text_lower))
        
        # If no database matches, try fallback mappings
        if not detected_conditions:
            detected_conditions.extend(self._detect_from_fallback(text_lower))
        
        # Remove duplicates based on ICD-11 code
        unique_conditions = []
        seen_codes = set()
        for condition in detected_conditions:
            if condition['icd11_code'] not in seen_codes:
                unique_conditions.append(condition)
                seen_codes.add(condition['icd11_code'])
        
        return unique_conditions
    
    def _detect_from_database(self, text_lower: str) -> List[Dict[str, str]]:
        """
        Detect conditions using database mappings
        """
        detected_conditions = []
        
        # Check for exact matches in database mappings
        for term, mapping in self.db_mappings.items():
            if term in text_lower:
                detected_conditions.append({
                    'condition': term,
                    'icd11_code': mapping['code'],
                    'icd11_name': mapping['name'],
                    'confidence': 'high' if mapping.get('confidence_score', 0) > 0.7 else 'medium',
                    'source': mapping.get('source', 'database')
                })
        
        # Check for partial matches (word boundaries)
        words = re.findall(r'\b\w+\b', text_lower)
        for word in words:
            if word in self.db_mappings and word not in [d['condition'] for d in detected_conditions]:
                mapping = self.db_mappings[word]
                detected_conditions.append({
                    'condition': word,
                    'icd11_code': mapping['code'],
                    'icd11_name': mapping['name'],
                    'confidence': 'medium',
                    'source': mapping.get('source', 'database')
                })
        
        return detected_conditions
    
    def _detect_from_fallback(self, text_lower: str) -> List[Dict[str, str]]:
        """
        Detect conditions using fallback mappings
        """
        detected_conditions = []
        
        for condition, data in self.fallback_mappings.items():
            if condition in text_lower:
                detected_conditions.append({
                    'condition': condition,
                    'icd11_code': data['code'],
                    'icd11_name': data['name'],
                    'confidence': 'low',
                    'source': 'fallback'
                })
        
        return detected_conditions
    
    def get_primary_condition(self, conditions: List[Dict[str, str]]) -> Dict[str, str]:
        """
        Get the primary/most severe condition from a list of detected conditions
        
        Args:
            conditions (List[Dict]): List of detected conditions
            
        Returns:
            Dict: Primary condition or default
        """
        if not conditions:
            return {
                'condition': 'general consultation',
                'icd11_code': 'QA00.0',
                'icd11_name': 'General adult medical examination',
                'confidence': 'low',
                'source': 'default'
            }
        
        # Sort by confidence and source priority
        def sort_key(condition):
            confidence_scores = {'high': 3, 'medium': 2, 'low': 1}
            source_scores = {'database': 3, 'csv_import': 2, 'fallback': 1, 'default': 0}
            
            confidence = confidence_scores.get(condition.get('confidence', 'low'), 1)
            source = source_scores.get(condition.get('source', 'fallback'), 1)
            
            return (confidence, source)
        
        sorted_conditions = sorted(conditions, key=sort_key, reverse=True)
        return sorted_conditions[0]
    
    def search_icd11_codes(self, query: str, limit: int = 10) -> List[Dict]:
        """
        Search ICD-11 codes in the database
        
        Args:
            query (str): Search query
            limit (int): Maximum number of results
            
        Returns:
            List[Dict]: List of matching ICD-11 codes
        """
        try:
            # Search in ICD11Mapping model
            mappings = ICD11Mapping.objects.filter(
                Q(description__icontains=query) |
                Q(code__icontains=query) |
                Q(local_terms__icontains=query),
                is_active=True
            )[:limit]
            
            results = []
            for mapping in mappings:
                results.append({
                    'code': mapping.code,
                    'description': mapping.description,
                    'confidence_score': mapping.confidence_score,
                    'source': mapping.source,
                    'local_terms': mapping.local_terms
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching ICD-11 codes: {str(e)}")
            return []
    
    def get_icd11_entity(self, entity_id: str) -> Dict:
        """
        Get ICD-11 entity details from database
        
        Args:
            entity_id (str): ICD-11 entity ID
            
        Returns:
            Dict: Entity details or None
        """
        try:
            entity = ICD11Entity.objects.filter(
                entity_id=entity_id,
                is_active=True
            ).first()
            
            if entity:
                return {
                    'entity_id': entity.entity_id,
                    'json_data': entity.json_data,
                    'last_updated': entity.last_updated.isoformat(),
                    'is_active': entity.is_active
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting ICD-11 entity: {str(e)}")
            return None
    
    def get_statistics(self) -> Dict:
        """
        Get statistics about the ICD-11 database
            
        Returns:
            Dict: Statistics about the database
        """
        try:
            total_entities = ICD11Entity.objects.filter(is_active=True).count()
            total_mappings = ICD11Mapping.objects.filter(is_active=True).count()
            
            # Count by source
            source_counts = {}
            for mapping in ICD11Mapping.objects.filter(is_active=True).values('source'):
                source = mapping['source']
                source_counts[source] = source_counts.get(source, 0) + 1
            
            return {
                'total_entities': total_entities,
                'total_mappings': total_mappings,
                'source_distribution': source_counts,
                'database_mappings_loaded': len(self.db_mappings)
            }
            
        except Exception as e:
            logger.error(f"Error getting statistics: {str(e)}")
        return {
                'total_entities': 0,
                'total_mappings': 0,
                'source_distribution': {},
                'database_mappings_loaded': 0
        }
