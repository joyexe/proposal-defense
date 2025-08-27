"""
Enhanced Hybrid ICD-11 Service with NLP Integration
Combines local NLP detection with WHO API for comprehensive medical condition analysis
"""

import os
import re
import time
import logging
import requests
import numpy as np
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings
from django.db import transaction
from django.utils import timezone
# Lazy import to avoid circular imports
# from .models import ICD11Entity, ICD11Mapping, AnalyticsCache
# from .icd11_service import ICD11Detector
# from .icd11_api_service import WHOICD11APIService

logger = logging.getLogger(__name__)

class HybridICD11Detector:
    """
    Enhanced hybrid ICD-11 detector with NLP integration and multi-language support
    """
    
    def __init__(self):
        self.local_detector = None
        self.who_api_service = None
        
        # NLP Model Configuration
        self.nlp_model_name = "bert-base-multilingual-cased"
        self.nlp_model = None
        self.nlp_loaded = False
        
        # BERT Models (lazy loading)
        self.bert_model = None
        self.bert_tokenizer = None
        self.fine_tuned_model = None
        self.fine_tuned_tokenizer = None
        self.label_mapping = None
        self._models_loaded = False
        
        # Don't load BERT models on init - use lazy loading instead
        
        # Rate limiting and performance
        self.rate_limit_delay = 0.5
        self.max_retries = 3
        self.retry_delay = 1.0
        
        # Cache configuration
        self.cache_timeout = 24 * 60 * 60  # 24 hours
        self.local_cache_timeout = 7 * 24 * 60 * 60  # 7 days
        
        # API status tracking
        self.api_failure_count = 0
        self.max_api_failures = 10
        self.api_cooldown_until = None
        
        # Models will be loaded lazily when needed
        
        # Lazy loading flag
        self._services_initialized = False
        
        # Enhanced condition mappings with Tagalog/English support
        self.enhanced_mappings = {
            # Fever and temperature related
            'fever': {
                'code': 'MD90.0', 
                'name': 'Fever',
                'local_terms': ['lagnat', 'init', 'mainit', 'fever', 'high temperature'],
                'confidence': 0.95
            },
            'high temperature': {
                'code': 'MD90.0', 
                'name': 'Fever',
                'local_terms': ['mataas na temperatura', 'high temp', 'elevated temperature'],
                'confidence': 0.90
            },
            
            # Headache and head pain
            'headache': {
                'code': '8A80.0', 
                'name': 'Headache',
                'local_terms': ['sakit ng ulo', 'head pain', 'migraine', 'head ache'],
                'confidence': 0.95
            },
            'migraine': {
                'code': '8A80.1', 
                'name': 'Migraine',
                'local_terms': ['migraine', 'matinding sakit ng ulo', 'severe headache'],
                'confidence': 0.90
            },
            
            # Respiratory conditions
            'cough': {
                'code': 'MD90.0', 
                'name': 'Cough',
                'local_terms': ['ubo', 'cough', 'dry cough', 'productive cough'],
                'confidence': 0.95
            },
            'sore throat': {
                'code': 'CA02.0', 
                'name': 'Acute pharyngitis',
                'local_terms': ['masakit na lalamunan', 'throat pain', 'sore throat', 'pharyngitis'],
                'confidence': 0.90
            },
            'cold': {
                'code': 'CA00.0', 
                'name': 'Acute upper respiratory infection',
                'local_terms': ['sipon', 'common cold', 'upper respiratory infection'],
                'confidence': 0.85
            },
            'flu': {
                'code': '1E32.0', 
                'name': 'Influenza due to unidentified influenza virus',
                'local_terms': ['trangkaso', 'influenza', 'flu', 'grippe'],
                'confidence': 0.90
            },
            
            # Gastrointestinal conditions
            'stomach ache': {
                'code': 'DA92.0', 
                'name': 'Abdominal pain',
                'local_terms': ['sakit ng tiyan', 'stomach pain', 'abdominal pain', 'belly ache'],
                'confidence': 0.90
            },
            'nausea': {
                'code': 'MD90.1', 
                'name': 'Nausea',
                'local_terms': ['nausea', 'nausea', 'feeling sick', 'queasy'],
                'confidence': 0.85
            },
            'vomiting': {
                'code': 'MD90.2', 
                'name': 'Vomiting',
                'local_terms': ['pagsusuka', 'vomiting', 'throwing up', 'emesis'],
                'confidence': 0.95
            },
            'diarrhea': {
                'code': 'DA92.1', 
                'name': 'Diarrhoea',
                'local_terms': ['diarrhea', 'diarrhoea', 'loose stools', 'watery stools'],
                'confidence': 0.90
            },
            
            # Injuries and trauma
            'injury': {
                'code': 'ND56.0', 
                'name': 'Injury',
                'local_terms': ['sugat', 'injury', 'wound', 'trauma'],
                'confidence': 0.85
            },
            'cut': {
                'code': 'ND56.1', 
                'name': 'Open wound',
                'local_terms': ['hiwa', 'cut', 'laceration', 'open wound'],
                'confidence': 0.90
            },
            'sprain': {
                'code': 'ND56.2', 
                'name': 'Sprain',
                'local_terms': ['sprain', 'pilay', 'ligament injury'],
                'confidence': 0.90
            },
            'strain': {
                'code': 'ND56.3', 
                'name': 'Strain',
                'local_terms': ['strain', 'muscle strain', 'tendon injury'],
                'confidence': 0.85
            },
            
            # Pain and discomfort
            'pain': {
                'code': 'MD90.3', 
                'name': 'Pain',
                'local_terms': ['sakit', 'pain', 'ache', 'discomfort'],
                'confidence': 0.80
            },
            'dizziness': {
                'code': '8A80.2', 
                'name': 'Dizziness',
                'local_terms': ['hilo', 'dizziness', 'vertigo', 'lightheaded'],
                'confidence': 0.90
            },
            
            # Fatigue and weakness
            'fatigue': {
                'code': 'MD90.4', 
                'name': 'Fatigue',
                'local_terms': ['pagod', 'fatigue', 'tired', 'exhausted'],
                'confidence': 0.85
            },
            
            # Skin conditions
            'rash': {
                'code': 'ED60.0', 
                'name': 'Rash',
                'local_terms': ['pantal', 'rash', 'skin rash', 'eruption'],
                'confidence': 0.90
            },
            
            # Eye conditions
            'eye pain': {
                'code': '9A00.0', 
                'name': 'Eye disorder',
                'local_terms': ['sakit ng mata', 'eye pain', 'eye irritation'],
                'confidence': 0.85
            },
            
            # Ear conditions
            'ear pain': {
                'code': 'AB30.0', 
                'name': 'Ear pain',
                'local_terms': ['sakit ng tenga', 'ear pain', 'earache'],
                'confidence': 0.90
            },
            
            # Dental conditions
            'toothache': {
                'code': 'DA01.0', 
                'name': 'Dental disorder',
                'local_terms': ['sakit ng ngipin', 'toothache', 'dental pain'],
                'confidence': 0.95
            },
            
            # Allergic reactions
            'allergy': {
                'code': '4A84.Z', 
                'name': 'Allergy',
                'local_terms': ['allergy', 'allergic', 'allergic reaction'],
                'confidence': 0.85
            },
            
            # Menstrual conditions
            'menstrual': {
                'code': 'GA34.0', 
                'name': 'Menstrual disorder',
                'local_terms': ['menstrual', 'period', 'cramps', 'dysmenorrhea'],
                'confidence': 0.90
            },
            
            # General symptoms
            'chills': {
                'code': 'MD90.5', 
                'name': 'Chills',
                'local_terms': ['ginaw', 'chills', 'shivering'],
                'confidence': 0.85
            },
            'dehydration': {
                'code': '5C62.0', 
                'name': 'Dehydration',
                'local_terms': ['dehydration', 'dehydrated', 'fluid loss'],
                'confidence': 0.90
            }
        }
        
        # Initialize enhanced mappings in database (skip for now to avoid crashes)
        # self._initialize_enhanced_mappings()
    
    def _initialize_enhanced_mappings(self):
        """Initialize enhanced mappings in the database"""
        self._initialize_services()
        try:
            with transaction.atomic():
                for condition, data in self.enhanced_mappings.items():
                    self.ICD11Mapping.objects.update_or_create(
                        code=data['code'],
                        defaults={
                            'description': data['name'],
                            'local_terms': data['local_terms'],
                            'confidence_score': data['confidence'],
                            'source': 'enhanced_local',
                            'is_active': True
                        }
                    )
            logger.info("Enhanced ICD-11 mappings initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing enhanced mappings: {str(e)}")
    
    def load_nlp_model(self):
        """Load the BERT model for enhanced text processing with ICD-11 medical specialization"""
        try:
            import torch
            from transformers import AutoTokenizer, AutoModel, AutoModelForSequenceClassification
            from sklearn.metrics.pairwise import cosine_similarity
            import numpy as np
            
            # Load BERT model and tokenizer
            self.model_name = "bert-base-multilingual-cased"
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.base_model = AutoModel.from_pretrained(self.model_name)
            
            # Load fine-tuned model for ICD-11 classification (if available)
            try:
                # Check if fine-tuned model exists
                fine_tuned_path = os.path.join(settings.BASE_DIR, 'analytics', 'models', 'icd11_bert_finetuned')
                if os.path.exists(fine_tuned_path):
                    self.fine_tuned_model = AutoModelForSequenceClassification.from_pretrained(fine_tuned_path)
                    self.fine_tuned_loaded = True
                    logger.info("Loaded fine-tuned BERT model for ICD-11 classification")
                else:
                    self.fine_tuned_model = None
                    self.fine_tuned_loaded = False
                    logger.info("Fine-tuned model not found, using base BERT model")
            except Exception as e:
                logger.warning(f"Could not load fine-tuned model: {str(e)}")
                self.fine_tuned_model = None
                self.fine_tuned_loaded = False
            
            # Initialize ICD-11 condition embeddings
            self.icd11_embeddings = self._initialize_icd11_embeddings()
            
            # Set model to evaluation mode
            self.base_model.eval()
            if self.fine_tuned_model:
                self.fine_tuned_model.eval()
            
            self.nlp_loaded = True
            logger.info("BERT model loaded successfully with ICD-11 medical specialization")
            
        except ImportError as e:
            logger.error(f"Required packages not installed: {str(e)}")
            logger.info("Install required packages: pip install torch transformers scikit-learn numpy")
            self.nlp_loaded = False
            # Set fallback mode
            self.bert_available = False
        except Exception as e:
            logger.error(f"Error loading BERT model: {str(e)}")
            self.nlp_loaded = False
            self.bert_available = False
    
    def _initialize_icd11_embeddings(self):
        """Initialize embeddings for ICD-11 conditions"""
        try:
            icd11_embeddings = {}
            
            # Create embeddings for each condition in enhanced mappings
            for condition, data in self.enhanced_mappings.items():
                # Combine condition name and local terms for embedding
                text_for_embedding = f"{data['name']} {' '.join(data['local_terms'])}"
                
                # Generate embedding
                embedding = self._generate_text_embedding(text_for_embedding)
                if embedding is not None:
                    icd11_embeddings[data['code']] = {
                        'embedding': embedding,
                        'name': data['name'],
                        'condition': condition,
                        'local_terms': data['local_terms']
                    }
            
            logger.info(f"Initialized embeddings for {len(icd11_embeddings)} ICD-11 conditions")
            return icd11_embeddings
            
        except Exception as e:
            logger.error(f"Error initializing ICD-11 embeddings: {str(e)}")
            return {}
    
    def _generate_text_embedding(self, text):
        """Generate BERT embedding for given text"""
        try:
            import torch
            
            # Tokenize text
            inputs = self.tokenizer(
                text, 
                return_tensors="pt", 
                padding=True, 
                truncation=True, 
                max_length=512
            )
            
            # Generate embeddings
            with torch.no_grad():
                outputs = self.base_model(**inputs)
                # Use mean pooling of last hidden state
                embedding = outputs.last_hidden_state.mean(dim=1)
            
            return embedding.numpy()
            
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            return None
    
    def _calculate_semantic_similarity(self, text1, text2):
        """Calculate semantic similarity between two texts using BERT embeddings"""
        try:
            # Check if required packages are available
            try:
                from sklearn.metrics.pairwise import cosine_similarity
            except ImportError:
                logger.warning("scikit-learn not available, returning 0.0 similarity")
                return 0.0
            
            # Generate embeddings
            embedding1 = self._generate_text_embedding(text1)
            embedding2 = self._generate_text_embedding(text2)
            
            if embedding1 is not None and embedding2 is not None:
                # Calculate cosine similarity
                similarity = cosine_similarity(embedding1, embedding2)[0][0]
                return float(similarity)
            
            return 0.0
            
        except Exception as e:
            logger.error(f"Error calculating semantic similarity: {str(e)}")
            return 0.0
    
    def detect_conditions(self, text: str, source_type: str = 'combined', vital_signs: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Enhanced condition detection with hybrid approach and vital signs support
        
        Args:
            text (str): Text to analyze (student/faculty reason + nurse documentation)
            source_type (str): Type of source (appointment, health_record, combined)
            vital_signs (Dict): Vital signs data for supporting detection
            
        Returns:
            List[Dict]: Enhanced detected conditions with confidence scores
        """
        if not text or not text.strip():
            return []
        
        text_lower = text.lower().strip()
        detected_conditions = []
        
        # Step 1: Enhanced local detection with multi-language support
        local_conditions = self._enhanced_local_detection(text_lower)
        detected_conditions.extend(local_conditions)
        
        # Step 2: Check database cache for existing mappings
        cached_conditions = self._check_database_cache(text_lower)
        detected_conditions.extend(cached_conditions)
        
        # Step 3: Apply vital signs support if available
        if vital_signs:
            detected_conditions = self._apply_vital_signs_support(detected_conditions, vital_signs)
        
        # Step 3: Try WHO API for additional data (if available)
        if self._is_api_available():
            api_enhanced_conditions = self._enhance_with_api(detected_conditions)
            detected_conditions = api_enhanced_conditions
        
        # Step 4: Remove duplicates and sort by confidence
        unique_conditions = self._deduplicate_conditions(detected_conditions)
        
        # Step 5: Cache results for future use
        self._cache_detection_results(text_lower, unique_conditions, source_type)
        
        return unique_conditions
    
    def _ensure_models_loaded(self):
        """Ensure BERT models are loaded (lazy loading)"""
        if not self._models_loaded:
            # Check if we're in development mode and should skip heavy models
            try:
                from django.conf import settings
                if hasattr(settings, 'DEVELOPMENT_MODE') and settings.DEVELOPMENT_MODE:
                    if not getattr(settings, 'ENABLE_BERT_MODELS', False):
                        logger.info("🚀 Development mode: Skipping BERT model loading for faster startup")
                        self._models_loaded = True
                        return
            except Exception:
                pass
                
            self._load_bert_models()
            self._models_loaded = True

    def _load_bert_models(self):
        """Load BERT models for semantic analysis and fine-tuned classification"""
        try:
            import torch
            from transformers import AutoTokenizer, AutoModel, AutoModelForSequenceClassification
            import json
            import os
            
            # Get model paths
            base_path = os.path.join(os.path.dirname(__file__), 'models')
            fine_tuned_path = os.path.join(base_path, 'icd11_bert_finetuned')
            
            # Load fine-tuned model
            if os.path.exists(fine_tuned_path):
                try:
                    self.fine_tuned_tokenizer = AutoTokenizer.from_pretrained(fine_tuned_path)
                    self.fine_tuned_model = AutoModelForSequenceClassification.from_pretrained(fine_tuned_path)
                    
                    # Load label mapping
                    label_mapping_path = os.path.join(fine_tuned_path, 'label_mapping.json')
                    if os.path.exists(label_mapping_path):
                        with open(label_mapping_path, 'r', encoding='utf-8') as f:
                            self.label_mapping = json.load(f)
                    
                    logger.info("Fine-tuned BERT model loaded successfully")
                except Exception as e:
                    logger.warning(f"Could not load fine-tuned model: {str(e)}")
            
            # Load base BERT model for semantic analysis
            try:
                self.bert_tokenizer = AutoTokenizer.from_pretrained(self.nlp_model_name)
                self.bert_model = AutoModel.from_pretrained(self.nlp_model_name)
                logger.info("Base BERT model loaded successfully")
            except Exception as e:
                logger.warning(f"Could not load base BERT model: {str(e)}")
                
        except ImportError:
            # logger.warning("Transformers library not available, BERT models not loaded")
            pass
        except Exception as e:
            logger.error(f"Error loading BERT models: {str(e)}")
    
    def detect_conditions_hybrid(self, text: str, source_type: str = 'combined', vital_signs: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        HYBRID DETECTION: Combines rule-based + ML/AI approaches
        
        Args:
            text (str): Text to analyze
            source_type (str): Type of source
            vital_signs (Dict): Vital signs data
            
        Returns:
            List[Dict]: Enhanced detected conditions with hybrid confidence scores
        """
        # Initialize services if not already done
        self._initialize_services()
        
        if not text or not text.strip():
            return []
        
        text_lower = text.lower().strip()
        all_detected_conditions = []
        
        # STEP 1: RULE-BASED DETECTION (Fast & Reliable)
        rule_based_conditions = self._enhanced_local_detection(text_lower)
        all_detected_conditions.extend(rule_based_conditions)
        
        # STEP 2: DATABASE CACHE CHECK
        cached_conditions = self._check_database_cache(text_lower)
        all_detected_conditions.extend(cached_conditions)
        
        # STEP 3: ML/AI DETECTION (Semantic Understanding)
        ml_conditions = self._ml_ai_detection(text_lower)
        all_detected_conditions.extend(ml_conditions)
        
        # STEP 4: ENSEMBLE SCORING (Combine Results)
        ensemble_conditions = self._ensemble_scoring(all_detected_conditions, text_lower)
        
        # STEP 5: VITAL SIGNS SUPPORT
        if vital_signs:
            ensemble_conditions = self._apply_vital_signs_support(ensemble_conditions, vital_signs)
        
        # STEP 6: WHO API ENHANCEMENT (Optional)
        if self._is_api_available():
            try:
                api_enhanced_conditions = self._enhance_with_api(ensemble_conditions)
                ensemble_conditions = api_enhanced_conditions
            except Exception as e:
                # logger.warning(f"WHO API enhancement failed: {str(e)}")
                pass
        
        # STEP 7: FINAL PROCESSING
        unique_conditions = self._deduplicate_conditions(ensemble_conditions)
        
        # STEP 8: CACHE RESULTS
        self._cache_detection_results(text_lower, unique_conditions, source_type)
        
        return unique_conditions
    
    def _enhanced_local_detection(self, text: str) -> List[Dict[str, Any]]:
        """Enhanced local detection with multi-language support"""
        detected_conditions = []
        
        # Check enhanced mappings
        for condition, data in self.enhanced_mappings.items():
            # Check main condition term
            if condition in text:
                detected_conditions.append({
                    'condition': condition,
                    'icd11_code': data['code'],
                    'icd11_name': data['name'],
                    'confidence': data['confidence'],
                    'source': 'enhanced_local',
                    'local_terms_matched': [condition]
                })
                continue
            
            # Check local terms (Tagalog/English)
            matched_terms = []
            for term in data['local_terms']:
                if term in text:
                    matched_terms.append(term)
            
            if matched_terms:
                detected_conditions.append({
                    'condition': condition,
                    'icd11_code': data['code'],
                    'icd11_name': data['name'],
                    'confidence': data['confidence'] * 0.9,  # Slightly lower for local terms
                    'source': 'enhanced_local',
                    'local_terms_matched': matched_terms
                })
        
        # Check word boundaries for more precise matching
        words = re.findall(r'\b\w+\b', text)
        for word in words:
            if word in self.enhanced_mappings and word not in [d['condition'] for d in detected_conditions]:
                data = self.enhanced_mappings[word]
                detected_conditions.append({
                    'condition': word,
                    'icd11_code': data['code'],
                    'icd11_name': data['name'],
                    'confidence': data['confidence'] * 0.8,  # Lower for word boundary matches
                    'source': 'enhanced_local',
                    'local_terms_matched': [word]
                })
        
        return detected_conditions
    
    def _ml_ai_detection(self, text: str) -> List[Dict[str, Any]]:
        """
        ADVANCED ML/AI DETECTION: BERT-based semantic understanding with ICD-11 medical specialization
        """
        ml_conditions = []
        
        try:
            # Check if ML features are enabled
            try:
                from django.conf import settings
                if hasattr(settings, 'DEVELOPMENT_MODE') and settings.DEVELOPMENT_MODE:
                    if not getattr(settings, 'ENABLE_BERT_MODELS', False):
                        logger.info("🚀 Development mode: Skipping ML/AI detection, using rule-based only")
                        return ml_conditions  # Return empty list, will use rule-based detection
            except Exception:
                pass
            
            # Ensure models are loaded before using them
            self._ensure_models_loaded()
            
            # STEP 1: BERT-based semantic similarity analysis
            if self.bert_model and self.bert_tokenizer:
                bert_conditions = self._bert_semantic_analysis(text)
                ml_conditions.extend(bert_conditions)
            
            # STEP 2: Fine-tuned model classification (if available)
            if self.fine_tuned_model and self.fine_tuned_tokenizer and self.label_mapping:
                fine_tuned_conditions = self._fine_tuned_classification(text)
                ml_conditions.extend(fine_tuned_conditions)
            
            # STEP 3: Enhanced pattern matching as fallback
            if not ml_conditions:
                pattern_conditions = self._enhanced_pattern_matching(text)
                ml_conditions.extend(pattern_conditions)
            
        except Exception as e:
            logger.error(f"ML/AI detection error: {str(e)}")
            # Fallback to enhanced pattern matching
            return self._enhanced_pattern_matching(text)
        
        return ml_conditions
    
    def _bert_semantic_analysis(self, text: str) -> List[Dict[str, Any]]:
        """
        BERT-BASED SEMANTIC ANALYSIS: Compare input text with ICD-11 condition embeddings
        """
        bert_conditions = []
        
        try:
            # Check if required packages are available
            try:
                import torch
                from sklearn.metrics.pairwise import cosine_similarity
            except ImportError:
                logger.warning("Required packages not available for BERT semantic analysis")
                return bert_conditions
            
            if not self.bert_model or not self.bert_tokenizer:
                return bert_conditions
            
            # Generate embedding for input text
            input_embedding = self._generate_text_embedding(text)
            if input_embedding is None:
                return bert_conditions
            
            # Compare with enhanced mappings using semantic similarity
            similarities = []
            for condition, data in self.enhanced_mappings.items():
                try:
                    # Generate embedding for condition terms
                    condition_text = f"{condition} {' '.join(data['local_terms'])}"
                    condition_embedding = self._generate_text_embedding(condition_text)
                    
                    if condition_embedding is not None:
                        similarity = cosine_similarity(input_embedding, condition_embedding)[0][0]
                        similarities.append({
                            'code': data['code'],
                            'name': data['name'],
                            'similarity': float(similarity),
                            'local_terms': data['local_terms']
                        })
                except Exception as e:
                    logger.warning(f"Error calculating similarity for {condition}: {str(e)}")
                    continue
            
            # Sort by similarity and filter by threshold
            similarities.sort(key=lambda x: x['similarity'], reverse=True)
            
            # Take top matches with similarity > 0.3
            for item in similarities[:3]:  # Top 3 matches
                if item['similarity'] > 0.3:
                    confidence = min(1.0, item['similarity'] * 1.2)
                    
                    bert_conditions.append({
                        'condition': item['name'].lower().replace(', unspecified', ''),
                        'icd11_code': item['code'],
                        'icd11_name': item['name'],
                        'confidence': confidence,
                        'source': 'bert_semantic',
                        'similarity_score': item['similarity'],
                        'local_terms_matched': item['local_terms']
                    })
            
            logger.info(f"BERT semantic analysis found {len(bert_conditions)} conditions")
            return bert_conditions
            
        except Exception as e:
            logger.error(f"Error in BERT semantic analysis: {str(e)}")
            return bert_conditions
    
    def _generate_text_embedding(self, text: str) -> Optional[np.ndarray]:
        """Generate BERT embedding for text"""
        try:
            # Check if required packages are available
            try:
                import torch
            except ImportError:
                logger.warning("PyTorch not available for text embedding")
                return None
            
            if not self.bert_model or not self.bert_tokenizer:
                return None
            
            # Tokenize text
            inputs = self.bert_tokenizer(
                text,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=128
            )
            
            # Generate embedding
            with torch.no_grad():
                outputs = self.bert_model(**inputs)
                # Use mean pooling of last hidden state
                embeddings = outputs.last_hidden_state.mean(dim=1)
                return embeddings.numpy()
                
        except Exception as e:
            logger.error(f"Error generating text embedding: {str(e)}")
            return None
    
    def _fine_tuned_classification(self, text: str) -> List[Dict[str, Any]]:
        """
        FINE-TUNED MODEL CLASSIFICATION: Use fine-tuned BERT for ICD-11 classification
        """
        fine_tuned_conditions = []
        
        try:
            # Check if required packages are available
            try:
                import torch
            except ImportError:
                logger.warning("PyTorch not available for fine-tuned classification")
                return fine_tuned_conditions
            
            if not self.fine_tuned_model or not self.fine_tuned_tokenizer or not self.label_mapping:
                return fine_tuned_conditions
            
            # Tokenize input
            inputs = self.fine_tuned_tokenizer(
                text,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=128
            )
            
            # Get predictions from fine-tuned model
            self.fine_tuned_model.eval()
            with torch.no_grad():
                outputs = self.fine_tuned_model(**inputs)
                probabilities = torch.softmax(outputs.logits, dim=-1)
                
                # Get top predictions
                top_probs, top_indices = torch.topk(probabilities, k=3, dim=1)
                
                for i in range(top_probs.shape[1]):
                    prob = float(top_probs[0][i])
                    idx = int(top_indices[0][i])
                    
                    if prob > 0.1:  # Confidence threshold
                        # Get ICD-11 code from label mapping
                        icd11_code = self.label_mapping.get('id_to_condition', {}).get(str(idx), f"UNKNOWN_{idx}")
                        
                        # Get condition details from enhanced mappings
                        condition_name = f'ICD-11 Code: {icd11_code}'
                        local_terms = []
                        
                        # Try to find in enhanced mappings
                        for condition, data in self.enhanced_mappings.items():
                            if data['code'] == icd11_code:
                                condition_name = data['name']
                                local_terms = data['local_terms']
                                break
                        
                        fine_tuned_conditions.append({
                            'condition': condition_name,
                            'icd11_code': icd11_code,
                            'icd11_name': condition_name,
                            'confidence': prob,
                            'source': 'fine_tuned_bert',
                            'model_probability': prob,
                            'local_terms_matched': local_terms
                        })
            
            logger.info(f"Fine-tuned classification found {len(fine_tuned_conditions)} conditions")
            return fine_tuned_conditions
            
        except Exception as e:
            logger.error(f"Error in fine-tuned classification: {str(e)}")
            return fine_tuned_conditions
    
    def _get_icd11_code_mapping(self):
        """
        Get mapping from model indices to ICD-11 codes
        This should be configured based on your fine-tuned model's training data
        """
        # This is a placeholder - you would need to configure this based on your fine-tuned model
        mapping = {}
        for i, (condition, data) in enumerate(self.enhanced_mappings.items()):
            mapping[i] = data['code']
        return mapping
    
    def _advanced_semantic_matching(self, text: str) -> List[Dict[str, Any]]:
        """
        ADVANCED SEMANTIC MATCHING: Enhanced semantic similarity with medical context
        """
        semantic_conditions = []
        
        # Medical context patterns
        medical_contexts = {
            'acute': {
                'keywords': ['acute', 'sudden', 'bigla', 'agad', 'immediate'],
                'boost_factor': 0.05
            },
            'chronic': {
                'keywords': ['chronic', 'long-term', 'matagal', 'paulit-ulit', 'recurring'],
                'boost_factor': 0.05
            },
            'severe': {
                'keywords': ['severe', 'matindi', 'malala', 'serious', 'critical'],
                'boost_factor': 0.08
            },
            'mild': {
                'keywords': ['mild', 'mababaw', 'konti', 'light', 'minor'],
                'boost_factor': -0.03
            }
        }
        
        # Check for medical context
        context_boost = 0.0
        detected_contexts = []
        
        for context_name, context_data in medical_contexts.items():
            context_keywords = context_data['keywords']
            boost_factor = context_data['boost_factor']
            
            for keyword in context_keywords:
                if keyword in text.lower():
                    context_boost += boost_factor
                    detected_contexts.append(context_name)
                    break
        
        # Apply semantic similarity with context boost
        for condition, data in self.enhanced_mappings.items():
            # Calculate semantic similarity
            similarity = self._calculate_semantic_similarity(text, data['name'])
            
            if similarity > 0.4:  # Higher threshold for semantic matching
                # Apply context boost
                adjusted_confidence = min(1.0, data['confidence'] + similarity * 0.3 + context_boost)
                
                semantic_conditions.append({
                    'condition': condition,
                    'icd11_code': data['code'],
                    'icd11_name': data['name'],
                    'confidence': adjusted_confidence,
                    'source': 'advanced_semantic',
                    'semantic_similarity': similarity,
                    'context_boost': context_boost,
                    'detected_contexts': detected_contexts,
                    'local_terms_matched': data['local_terms']
                })
        
        return semantic_conditions
    
    def _context_aware_analysis(self, text: str) -> List[Dict[str, Any]]:
        """
        CONTEXT-AWARE ANALYSIS: Analyze text with medical context understanding
        """
        context_conditions = []
        
        # Medical symptom patterns with context
        symptom_patterns = {
            'pain_location': {
                'patterns': [
                    r'(sakit|pain|masakit)\s+(ng|sa|in)\s+(ulo|head)',
                    r'(sakit|pain|masakit)\s+(ng|sa|in)\s+(tiyan|stomach|abdomen)',
                    r'(sakit|pain|masakit)\s+(ng|sa|in)\s+(tenga|ear)',
                    r'(sakit|pain|masakit)\s+(ng|sa|in)\s+(ngipin|tooth)',
                    r'(sakit|pain|masakit)\s+(ng|sa|in)\s+(likod|back)',
                    r'(sakit|pain|masakit)\s+(ng|sa|in)\s+(kamay|hand)',
                    r'(sakit|pain|masakit)\s+(ng|sa|in)\s+(paa|foot|leg)'
                ],
                'mappings': {
                    'ulo|head': {'code': '8A80.0', 'name': 'Headache', 'confidence': 0.95},
                    'tiyan|stomach|abdomen': {'code': 'DA92.0', 'name': 'Abdominal pain', 'confidence': 0.95},
                    'tenga|ear': {'code': 'AB30.0', 'name': 'Ear pain', 'confidence': 0.95},
                    'ngipin|tooth': {'code': 'DA01.0', 'name': 'Dental disorder', 'confidence': 0.95},
                    'likod|back': {'code': '8A80.3', 'name': 'Back pain', 'confidence': 0.90},
                    'kamay|hand': {'code': 'ND56.4', 'name': 'Hand injury', 'confidence': 0.85},
                    'paa|foot|leg': {'code': 'ND56.5', 'name': 'Leg injury', 'confidence': 0.85}
                }
            },
            'symptom_intensity': {
                'patterns': [
                    r'(matindi|severe|malala|intense)\s+(sakit|pain)',
                    r'(mild|mababaw|konti|light)\s+(sakit|pain)',
                    r'(moderate|katamtaman|medium)\s+(sakit|pain)'
                ],
                'intensity_boost': {
                    'matindi|severe|malala|intense': 0.1,
                    'mild|mababaw|konti|light': -0.05,
                    'moderate|katamtaman|medium': 0.02
                }
            }
        }
        
        # Analyze pain location
        for pattern in symptom_patterns['pain_location']['patterns']:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                matched_text = match.group(0)
                
                # Find corresponding mapping
                for location_key, mapping_data in symptom_patterns['pain_location']['mappings'].items():
                    if any(loc in matched_text.lower() for loc in location_key.split('|')):
                        context_conditions.append({
                            'condition': mapping_data['name'].lower().replace(', unspecified', ''),
                            'icd11_code': mapping_data['code'],
                            'icd11_name': mapping_data['name'],
                            'confidence': mapping_data['confidence'],
                            'source': 'context_aware',
                            'matched_pattern': pattern,
                            'location_detected': location_key,
                            'local_terms_matched': [matched_text]
                        })
                        break
        
        # Analyze symptom intensity
        for pattern in symptom_patterns['symptom_intensity']['patterns']:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                matched_text = match.group(0)
                
                # Find intensity boost
                for intensity_key, boost in symptom_patterns['symptom_intensity']['intensity_boost'].items():
                    if any(intensity in matched_text.lower() for intensity in intensity_key.split('|')):
                        # Apply intensity boost to existing conditions
                        for condition in context_conditions:
                            condition['confidence'] = min(1.0, condition['confidence'] + boost)
                            condition['intensity_boost'] = boost
                        break
        
        return context_conditions
    
    def _enhanced_pattern_matching(self, text: str) -> List[Dict[str, Any]]:
        """
        ENHANCED PATTERN MATCHING: Advanced rule-based detection
        """
        pattern_conditions = []
        
        # Advanced pattern matching with context
        patterns = {
            r'\b(sakit\s+ng\s+tiyan|stomach\s+pain|abdominal\s+pain)\b': {
                'code': 'DA92.0',
                'name': 'Abdominal pain',
                'confidence': 0.95,
                'source': 'pattern_matching'
            },
            r'\b(lagnat|fever|high\s+temp|elevated\s+temperature)\b': {
                'code': 'MD90.0',
                'name': 'Fever',
                'confidence': 0.95,
                'source': 'pattern_matching'
            },
            r'\b(sakit\s+ng\s+ulo|headache|head\s+pain)\b': {
                'code': '8A80.0',
                'name': 'Headache',
                'confidence': 0.95,
                'source': 'pattern_matching'
            },
            r'\b(ubo|cough|dry\s+cough)\b': {
                'code': 'MD90.0',
                'name': 'Cough',
                'confidence': 0.95,
                'source': 'pattern_matching'
            }
        }
        
        for pattern, condition_data in patterns.items():
            if re.search(pattern, text, re.IGNORECASE):
                pattern_conditions.append({
                    'condition': condition_data['name'].lower().replace(', unspecified', ''),
                    'icd11_code': condition_data['code'],
                    'icd11_name': condition_data['name'],
                    'confidence': condition_data['confidence'],
                    'source': condition_data['source'],
                    'local_terms_matched': [pattern]
                })
        
        return pattern_conditions
    
    def _ensemble_scoring(self, conditions: List[Dict[str, Any]], text: str) -> List[Dict[str, Any]]:
        """
        ENSEMBLE SCORING: Combine rule-based and ML/AI results
        """
        if not conditions:
            return []
        
        # Group conditions by ICD-11 code
        code_groups = {}
        for condition in conditions:
            code = condition['icd11_code']
            if code not in code_groups:
                code_groups[code] = []
            code_groups[code].append(condition)
        
        # Calculate ensemble scores
        ensemble_conditions = []
        for code, group_conditions in code_groups.items():
            if len(group_conditions) == 1:
                # Single detection method
                ensemble_condition = group_conditions[0].copy()
                ensemble_condition['ensemble_score'] = ensemble_condition['confidence']
                ensemble_condition['detection_methods'] = [ensemble_condition['source']]
            else:
                # Multiple detection methods - combine scores
                base_confidence = max(c['confidence'] for c in group_conditions)
                method_count = len(group_conditions)
                
                # Ensemble scoring formula
                ensemble_score = min(1.0, base_confidence + (0.05 * method_count))
                
                # Create ensemble condition
                best_condition = max(group_conditions, key=lambda x: x['confidence'])
                ensemble_condition = best_condition.copy()
                ensemble_condition['confidence'] = ensemble_score
                ensemble_condition['ensemble_score'] = ensemble_score
                ensemble_condition['detection_methods'] = [c['source'] for c in group_conditions]
                ensemble_condition['source'] = 'hybrid_ensemble'
            
            ensemble_conditions.append(ensemble_condition)
        
        # Sort by ensemble score
        ensemble_conditions.sort(key=lambda x: x['ensemble_score'], reverse=True)
        
        return ensemble_conditions
    
    def _check_database_cache(self, text: str) -> List[Dict[str, Any]]:
        """Check database for existing ICD-11 mappings"""
        try:
            # Search for mappings that might match the text
            mappings = self.ICD11Mapping.objects.filter(is_active=True)
            detected_conditions = []
            
            for mapping in mappings:
                # Check if any local terms match
                local_terms = mapping.local_terms or []
                matched_terms = [term for term in local_terms if term.lower() in text]
                
                if matched_terms:
                    detected_conditions.append({
                        'condition': mapping.description,
                        'icd11_code': mapping.code,
                        'icd11_name': mapping.description,
                        'confidence': mapping.confidence_score,
                        'source': mapping.source,
                        'local_terms_matched': matched_terms
                    })
            
            return detected_conditions
        except Exception as e:
            logger.error(f"Error checking database cache: {str(e)}")
            return []
    
    def _apply_vital_signs_support(self, conditions: List[Dict[str, Any]], vital_signs: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Apply vital signs support to enhance condition detection confidence
        
        Args:
            conditions: List of detected conditions
            vital_signs: Dictionary containing vital signs data
            
        Returns:
            List of conditions with updated confidence scores
        """
        if not vital_signs:
            return conditions
        
        supported_conditions = []
        
        for condition in conditions:
            enhanced_condition = condition.copy()
            confidence_boost = 0.0
            
            # Check fever indicators
            if condition['icd11_code'] == 'MD90.0':  # Fever
                if self._check_fever_indicators(vital_signs):
                    confidence_boost = 0.05
            
            # Check respiratory indicators
            elif condition['icd11_code'] in ['MD90.0', 'CA02.0', 'CA00.0', '1E32.0', 'MD90.7']:  # Respiratory conditions
                if self._check_respiratory_indicators(vital_signs):
                    confidence_boost = 0.05
            
            # Check cardiovascular indicators
            elif condition['icd11_code'] in ['8A80.2', 'MD90.6']:  # Dizziness, chest pain
                if self._check_cardiovascular_indicators(vital_signs):
                    confidence_boost = 0.05
            
            # Check gastrointestinal indicators
            elif condition['icd11_code'] in ['DA92.0', 'MD90.1', 'MD90.2', 'DA92.1']:  # GI conditions
                if self._check_gastrointestinal_indicators(vital_signs):
                    confidence_boost = 0.05
            
            # Apply confidence boost
            if confidence_boost > 0:
                enhanced_condition['confidence'] = min(1.0, enhanced_condition['confidence'] + confidence_boost)
                enhanced_condition['vital_signs_support'] = True
                enhanced_condition['confidence_boost'] = confidence_boost
            else:
                enhanced_condition['vital_signs_support'] = False
                enhanced_condition['confidence_boost'] = 0.0
            
            supported_conditions.append(enhanced_condition)
        
        return supported_conditions
    
    def _check_fever_indicators(self, vital_signs: Dict[str, Any]) -> bool:
        """Check if vital signs support fever detection"""
        try:
            # Check temperature
            temp = vital_signs.get('temperature')
            if temp and float(temp) > 37.5:
                return True
            
            # Check pulse
            pulse = vital_signs.get('pulse')
            if pulse and int(pulse) > 80:
                return True
            
            return False
        except (ValueError, TypeError):
            return False
    
    def _check_respiratory_indicators(self, vital_signs: Dict[str, Any]) -> bool:
        """Check if vital signs support respiratory conditions"""
        try:
            # Check respiratory rate
            resp_rate = vital_signs.get('respiratory_rate')
            if resp_rate and int(resp_rate) > 20:
                return True
            
            # Check pulse
            pulse = vital_signs.get('pulse')
            if pulse and int(pulse) > 80:
                return True
            
            return False
        except (ValueError, TypeError):
            return False
    
    def _check_cardiovascular_indicators(self, vital_signs: Dict[str, Any]) -> bool:
        """Check if vital signs support cardiovascular conditions"""
        try:
            # Check blood pressure
            bp = vital_signs.get('blood_pressure')
            if bp:
                if '/' in str(bp):
                    systolic, diastolic = str(bp).split('/')
                    if int(systolic) > 140 or int(diastolic) > 90:
                        return True
                    if int(systolic) < 90 or int(diastolic) < 60:
                        return True
            
            # Check pulse
            pulse = vital_signs.get('pulse')
            if pulse:
                pulse_val = int(pulse)
                if pulse_val > 100 or pulse_val < 60:
                    return True
            
            return False
        except (ValueError, TypeError):
            return False
    
    def _check_gastrointestinal_indicators(self, vital_signs: Dict[str, Any]) -> bool:
        """Check if vital signs support gastrointestinal conditions"""
        try:
            # Check pulse (may be elevated in GI conditions)
            pulse = vital_signs.get('pulse')
            if pulse and int(pulse) > 80:
                return True
            
            # Check blood pressure (may be low if dehydrated)
            bp = vital_signs.get('blood_pressure')
            if bp:
                if '/' in str(bp):
                    systolic, diastolic = str(bp).split('/')
                    if int(systolic) < 110:
                        return True
            
            return False
        except (ValueError, TypeError):
            return False
    
    def _enhance_with_api(self, conditions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enhance conditions with WHO API data"""
        enhanced_conditions = []
        
        for condition in conditions:
            enhanced_condition = condition.copy()
            
            try:
                # Get additional data from WHO API
                api_data = self._get_icd11_data_from_api(condition['icd11_code'])
                if api_data:
                    enhanced_condition.update({
                        'api_data': api_data,
                        'source': 'hybrid',
                        'enhanced': True
                    })
                else:
                    enhanced_condition['enhanced'] = False
                    
            except Exception as e:
                logger.warning(f"Error enhancing condition {condition['icd11_code']}: {str(e)}")
                enhanced_condition['enhanced'] = False
            
            enhanced_conditions.append(enhanced_condition)
        
        return enhanced_conditions
    
    def _get_icd11_data_from_api(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Get ICD-11 data from WHO API with caching"""
        try:
            # Check local database cache first
            local_data = self._get_from_local_cache(entity_id)
            if local_data:
                return local_data
            
            # Check if API is available
            if not self._is_api_available():
                return None
            
            # Fetch from WHO API with retry logic
            api_data = self._fetch_from_who_api_with_retry(entity_id)
            if api_data:
                # Cache the result
                self._cache_locally(entity_id, api_data)
                return api_data
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting ICD-11 data for {entity_id}: {str(e)}")
            return None
    
    def _get_from_local_cache(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Get data from local PostgreSQL cache"""
        try:
            # Ensure services are initialized
            self._initialize_services()
            
            entity = self.ICD11Entity.objects.filter(
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
            # Ensure services are initialized
            self._initialize_services()
            
            with transaction.atomic():
                entity, created = self.ICD11Entity.objects.update_or_create(
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
    
    def _initialize_services(self):
        """Lazy initialization of services to avoid circular imports"""
        if self._services_initialized:
            return
            
        try:
            # Import here to avoid circular imports
            from .models import ICD11Entity, ICD11Mapping, AnalyticsCache
            from .icd11_service import ICD11Detector
            from .icd11_api_service import WHOICD11APIService
            
            # Store model classes for later use
            self.ICD11Entity = ICD11Entity
            self.ICD11Mapping = ICD11Mapping
            self.AnalyticsCache = AnalyticsCache
            
            # Initialize services
            self.local_detector = ICD11Detector()
            self.who_api_service = WHOICD11APIService()
            
            self._services_initialized = True
            logger.info("Hybrid ICD-11 detector services initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing hybrid ICD-11 detector services: {str(e)}")
            # Set fallback behavior
            self.local_detector = None
            self.who_api_service = None
    
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
                    pass
                    
            except Exception as e:
                self.api_failure_count += 1
                logger.error(f"API error for {entity_id} (attempt {attempt + 1}): {str(e)}")
                
                if attempt == self.max_retries - 1:
                    logger.error(f"All retry attempts failed for {entity_id}")
                    return None
        
        return None
    
    def _deduplicate_conditions(self, conditions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate conditions and sort by confidence"""
        unique_conditions = []
        seen_codes = set()
        
        for condition in conditions:
            if condition['icd11_code'] not in seen_codes:
                unique_conditions.append(condition)
                seen_codes.add(condition['icd11_code'])
        
        # Sort by confidence score (highest first)
        unique_conditions.sort(key=lambda x: x.get('confidence', 0), reverse=True)
        
        return unique_conditions
    
    def _cache_detection_results(self, text: str, conditions: List[Dict[str, Any]], source_type: str):
        """Cache detection results for future use"""
        try:
            # Cache in memory for quick access
            cache_key = f"icd11_detection_{hash(text)}"
            cache.set(cache_key, conditions, self.cache_timeout)
            
            # Update analytics cache for trending
            for condition in conditions:
                self._update_analytics_cache(condition, source_type)
                
        except Exception as e:
            logger.error(f"Error caching detection results: {str(e)}")
    
    def _update_analytics_cache(self, condition: Dict[str, Any], source_type: str):
        """Update analytics cache for trending data"""
        if not self._services_initialized:
            return  # Skip if services not initialized
        try:
            today = timezone.now().date()
            
            # Get or create ICD mapping
            icd_mapping, created = self.ICD11Mapping.objects.get_or_create(
                code=condition['icd11_code'],
                defaults={
                    'description': condition['icd11_name'],
                    'local_terms': condition.get('local_terms_matched', []),
                    'confidence_score': condition.get('confidence', 0.0),
                    'source': condition.get('source', 'local')
                }
            )
            
            # Update analytics cache
            analytics_cache, created = self.AnalyticsCache.objects.get_or_create(
                date=today,
                icd_code=icd_mapping,
                source_type=source_type,
                defaults={'count': 1}
            )
            
            if not created:
                analytics_cache.count += 1
                analytics_cache.save()
                
        except Exception as e:
            logger.error(f"Error updating analytics cache: {str(e)}")
    
    def get_primary_condition(self, conditions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get the primary/most severe condition from a list"""
        if not conditions:
            return {
                'condition': 'general consultation',
                'icd11_code': 'QA00.0',
                'icd11_name': 'General medical examination',
                'confidence': 0.5,
                'source': 'fallback'
            }
        
        # Return the condition with highest confidence
        return max(conditions, key=lambda x: x.get('confidence', 0))
    
    def format_condition_display(self, condition: Dict[str, Any]) -> str:
        """Format condition for display in analytics"""
        icd11_name = condition['icd11_name']
        code = condition['icd11_code']
        
        # Simplify common names for display
        name_mapping = {
            'Fever, unspecified': 'Fever',
            'Headache, unspecified': 'Headache',
            'Acute pharyngitis, unspecified': 'Sore Throat',
            'Acute upper respiratory infection, unspecified': 'Common Cold',
            'Influenza due to unidentified influenza virus with other respiratory manifestations': 'Influenza',
            'Unspecified abdominal pain': 'Stomach Pain',
            'Cough': 'Cough',
            'Dyspnoea': 'Difficulty Breathing',
            'Pain, unspecified': 'General Pain',
            'Dizziness and giddiness': 'Dizziness',
            'Other malaise and fatigue': 'Fatigue',
            'Rash and other nonspecific skin eruption': 'Skin Rash',
            'Otalgia': 'Ear Pain',
            'General adult medical examination': 'General Consultation',
            'Sprain of unspecified joint and ligament': 'Sprain',
            'Strain of unspecified muscle and tendon': 'Strain',
            'Multiple unspecified injuries': 'Injury',
            'Superficial injury of unspecified body region': 'Minor Injury',
            'Fracture of unspecified body region': 'Fracture',
            'Unspecified disorder of eye and adnexa': 'Eye Problem',
            'Other specified disorders of teeth and supporting structures': 'Dental Problem',
            'Unspecified condition associated with female genital organs and menstrual cycle': 'Menstrual Issue',
            'Other general symptoms and signs': 'General Symptoms',
            'Hyperhidrosis, unspecified': 'Excessive Sweating',
            'Volume depletion': 'Dehydration',
            'Allergy, unspecified': 'Allergy',
            'Anorexia': 'Loss of Appetite',
            'Haemorrhage, not elsewhere classified': 'Bleeding',
            'Pruritus, unspecified': 'Itching',
            'Urticaria, unspecified': 'Hives'
        }
        
        display_name = name_mapping.get(icd11_name, icd11_name)
        return f"{display_name} ({code})"
    
    def get_condition_details(self, condition_code: str) -> Dict[str, Any]:
        """Get detailed information for a specific condition code"""
        self._initialize_services()
        try:
            # Try to get from database first
            mapping = self.ICD11Mapping.objects.filter(code=condition_code, is_active=True).first()
            if mapping:
                return {
                    'code': mapping.code,
                    'name': mapping.description,
                    'local_terms': mapping.local_terms,
                    'confidence': mapping.confidence_score,
                    'source': mapping.source
                }
            
            # Fallback to enhanced mappings
            for condition, data in self.enhanced_mappings.items():
                if data['code'] == condition_code:
                    return {
                        'code': data['code'],
                        'name': data['name'],
                        'local_terms': data['local_terms'],
                        'confidence': data['confidence'],
                        'source': 'enhanced_local'
                    }
            
            # Generic fallback
            return {
                'code': condition_code,
                'name': f'ICD-11 Code: {condition_code}',
                'local_terms': [],
                'confidence': 0.0,
                'source': 'unknown'
            }
            
        except Exception as e:
            logger.error(f"Error getting condition details for {condition_code}: {str(e)}")
            return {
                'code': condition_code,
                'name': f'ICD-11 Code: {condition_code}',
                'local_terms': [],
                'confidence': 0.0,
                'source': 'error'
            }
    
    def get_service_status(self) -> Dict[str, Any]:
        """Get comprehensive service status"""
        self._initialize_services()
        try:
            # Database statistics
            total_mappings = self.ICD11Mapping.objects.count()
            active_mappings = self.ICD11Mapping.objects.filter(is_active=True).count()
            total_cache_entries = self.AnalyticsCache.objects.count()
            
            # API status
            api_status = self.who_api_service.get_api_status() if self.who_api_service else {}
            
            # Performance metrics
            performance_metrics = {
                'api_available': self._is_api_available(),
                'api_failure_count': self.api_failure_count,
                'api_cooldown_active': bool(self.api_cooldown_until and timezone.now() < self.api_cooldown_until),
                'nlp_loaded': self.nlp_loaded,
                'enhanced_mappings_count': len(self.enhanced_mappings)
            }
            
            return {
                'database_stats': {
                    'total_mappings': total_mappings,
                    'active_mappings': active_mappings,
                    'total_cache_entries': total_cache_entries
                },
                'api_status': api_status,
                'performance_metrics': performance_metrics,
                'enhanced_features': {
                    'multi_language_support': True,
                    'hybrid_detection': True,
                    'confidence_scoring': True,
                    'local_terms_mapping': True
                },
                'last_updated': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting service status: {str(e)}")
            return {'error': str(e)}

# Global instance
hybrid_icd11_detector = HybridICD11Detector()
