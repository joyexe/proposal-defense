"""
Enhanced Mental Health ICD-11 Detection Service with BERT Integration
Uses official WHO ICD-11 dataset and BERT model for accurate mental health condition detection
"""

import re
import json
import pandas as pd
import numpy as np
import torch
from typing import List, Dict, Tuple, Optional
from django.conf import settings
from django.db.models import Q
from analytics.models import ICD11Mapping, ICD11Entity
import logging
import os
from transformers import AutoTokenizer, AutoModel, AutoModelForSequenceClassification
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

class EnhancedMentalHealthDetector:
    """
    Enhanced mental health detector with BERT integration and official ICD-11 codes
    """
    
    def __init__(self):
        # Load official ICD-11 dataset
        self._load_official_icd11_dataset()
        
        # Initialize BERT model (lazy loading)
        self.bert_model = None
        self.bert_tokenizer = None
        self.bert_loaded = False
        
        # Load database mappings
        self._load_database_mappings()
        
        # Enhanced mental health mappings with correct ICD-11 codes
        self.enhanced_mental_health_mappings = {
            # High Risk Conditions (corrected codes)
            'suicide': {
                'code': '6A72',  # Corrected from MB26.0
                'name': 'Suicidal ideation',
                'risk_level': 'high',
                'interventions': [
                    'Immediate safety assessment and crisis intervention',
                    'Referral to emergency mental health services',
                    'Safety planning with student and family',
                    'Follow-up within 24-48 hours',
                    'Consider hospitalization if risk is imminent'
                ]
            },
            'self_harm': {
                'code': '6A73',  # Corrected from MB26.1
                'name': 'Non-suicidal self-injury',
                'risk_level': 'high',
                'interventions': [
                    'Safety assessment and harm reduction strategies',
                    'Dialectical Behavior Therapy (DBT) skills training',
                    'Regular monitoring and check-ins',
                    'Family involvement and support',
                    'Referral to specialized mental health services'
                ]
            },
            'severe_depression': {
                'code': '6A70',  # Correct - exists in dataset
                'name': 'Depressive disorder',
                'risk_level': 'high',
                'interventions': [
                    'Comprehensive depression assessment',
                    'Cognitive Behavioral Therapy (CBT)',
                    'Medication evaluation if indicated',
                    'Regular suicide risk assessment',
                    'Family psychoeducation and support'
                ]
            },
            'psychosis': {
                'code': '6A20',  # Correct - exists in dataset
                'name': 'Schizophrenia',
                'risk_level': 'high',
                'interventions': [
                    'Immediate psychiatric evaluation',
                    'Medication management',
                    'Family psychoeducation',
                    'Coordinated care with mental health professionals',
                    'Regular monitoring of symptoms'
                ]
            },
            
            # Moderate Risk Conditions
            'anxiety': {
                'code': '6B00',  # Correct - exists in dataset
                'name': 'Generalised anxiety disorder',
                'risk_level': 'moderate',
                'interventions': [
                    'Anxiety assessment and psychoeducation',
                    'Relaxation techniques and stress management',
                    'Cognitive Behavioral Therapy (CBT)',
                    'Gradual exposure therapy',
                    'Regular check-ins and progress monitoring'
                ]
            },
            'social_anxiety': {
                'code': '6B04',  # Correct - exists in dataset
                'name': 'Social anxiety disorder',
                'risk_level': 'moderate',
                'interventions': [
                    'Social anxiety assessment',
                    'Cognitive Behavioral Therapy (CBT)',
                    'Social skills training',
                    'Gradual exposure to social situations',
                    'Support groups and peer support'
                ]
            },
            'mixed_depression_anxiety': {
                'code': '6A73',  # Correct - exists in dataset
                'name': 'Mixed depressive and anxiety disorder',
                'risk_level': 'moderate',
                'interventions': [
                    'Comprehensive mood and anxiety assessment',
                    'Integrated treatment approach',
                    'Medication evaluation if indicated',
                    'Regular monitoring of both conditions',
                    'Family psychoeducation'
                ]
            },
            
            # Low Risk Conditions
            'adjustment': {
                'code': '6B43',  # Correct - exists in dataset
                'name': 'Adjustment disorder',
                'risk_level': 'low',
                'interventions': [
                    'Supportive counseling',
                    'Problem-solving skills development',
                    'Social support enhancement',
                    'Regular monitoring',
                    'Gradual return to normal activities'
                ]
            },
            'mild_depression': {
                'code': '6A70.0',  # Correct - exists in dataset
                'name': 'Mild depressive episode',
                'risk_level': 'low',
                'interventions': [
                    'Depression screening and assessment',
                    'Supportive counseling and psychoeducation',
                    'Behavioral activation strategies',
                    'Social support enhancement',
                    'Regular mood monitoring'
                ]
            }
        }
        
        # Multi-language keywords (English and Tagalog)
        self.keywords = {
            'suicide': [
                'suicide', 'kill myself', 'want to die', 'end my life', 'self-harm', 'self harm',
                'cut myself', 'hurt myself', 'magpapakamatay', 'gusto ko mamatay', 'ayoko na mabuhay',
                'wala nang kwenta', 'wala na akong rason', 'goodbye world', 'paalam na',
                'magwawakas na lahat', 'di ko na kaya', 'wala nang pag-asa', 'susuko na ako',
                'mag-aalay ng buhay', 'i\'m ending it', 'lahat iiwan ko na', 'time to go',
                'sawa na ako sa lahat', 'ayoko na goodbye', 'maglalaho na lang ako',
                'i will end it all', 'wala na akong silbi', 'gusto ko mawala', 'bye forever',
                'final goodbye', 'end life', 'ayoko na tapos na', 'ubos na ako', 'magpakamatay',
                'i just wanna die', 'see you in another life', 'lahat ng sakit tatapusin ko na',
                'mamamatay na lang ako', 'kms', 'kys', 'unalive', 'unaliving'
            ],
            'depression': [
                'depressed', 'depression', 'sad', 'hopeless', 'worthless', 'empty', 'lungkot', 
                'walang gana', 'sawang sawa na ako', 'wala akong silbi', 'pangit ako', 
                'walang nagmamahal sa akin', 'nobody cares', 'hate myself', 'i\'m worthless', 
                'pagod na pagod ako sa buhay', 'walang kwenta lahat', 'iniwan ako', 
                'hindi ako mahalaga', 'ayoko lumabas', 'wala akong kaibigan', 
                'di ako mahal ng pamilya ko', 'ayoko makipag-usap kahit kanino',
                'gusto ko mag-isa lang', 'lagi akong malungkot', 'di ko maintindihan sarili ko',
                'sobrang lungkot', 'naiiyak ako', 'i feel empty', 'wala akong gana', 
                'hindi ako okay', 'not okay', 'broken ako', 'heartbroken', 'iniwan sa ere',
                'gusto ko mawala pero di ko alam paano', 'napapaisip ako sa buhay',
                'nasa dark place ako', 'wala akong pag-asa', 'i hate my life', 
                'galit ako sa sarili ko', 'mali lagi ako', 'lahat mali'
            ],
            'anxiety': [
                'anxiety', 'anxious', 'worried', 'nervous', 'panic', 'fear', 'kabado', 'takot',
                'kinakabahan ako araw-araw', 'di ko alam gagawin ko', 'nai-stress ako sobra',
                'takot ako', 'kinakabahan ako', 'nangangamba', 'kaba lang siguro', 
                'nahihiya ako', 'social anxiety', 'social phobia', 'crowd anxiety',
                'public speaking fear', 'takot sa tao', 'nahihiya sa iba'
            ],
            'stress': [
                'stress', 'stressed', 'pressure', 'overwhelmed', 'nai-stress', 'sobrang busy',
                'nakakapagod', 'tinamad ako', 'nahihirapan ako sa school', 'naiirita ako',
                'mainit ulo ko', 'bored ako', 'bad trip', 'overwhelmed', 'worried',
                'toxic yung araw ko', 'mabigat pakiramdam ko', 'tinatamad ako gumawa ng school work',
                'ayoko pumasok', 'nahihirapan ako mag-focus', 'wala ako sa mood', 'na-off ako',
                'meh lang', 'hassle', 'tinatamad bumangon', 'need pahinga'
            ],
            'bullying': [
                'bullying', 'bullied', 'harassment', 'teasing', 'picked on', 'mean', 'hurt me',
                'pinagtripan', 'binubully', 'sinasaktan', 'pinagtatawanan', 'pinagkakatuwaan',
                'walang respeto', 'sinisiraan', 'chismis', 'gossip', 'rumors', 'tsismis'
            ]
        }
    
    def _load_official_icd11_dataset(self):
        """Load official ICD-11 dataset for Chapter 6 mental health conditions"""
        try:
            dataset_path = os.path.join(settings.BASE_DIR, '..', 'datasets', 'icd11_conditions.csv')
            
            if os.path.exists(dataset_path):
                df = pd.read_csv(dataset_path)
                
                # Filter for Chapter 6 mental health conditions
                self.chapter6_conditions = df[df['ChapterNo'] == 6].copy()
                
                # Create embeddings for BERT matching
                self.condition_embeddings = {}
                self.condition_texts = {}
                
                for _, row in self.chapter6_conditions.iterrows():
                    if pd.notna(row['Code']) and pd.notna(row['Title']):
                        code = row['Code']
                        title = row['Title']
                        
                        # Store condition data
                        self.condition_texts[code] = title
                        
                        # Create text for embedding
                        text = f"{title}"
                        if pd.notna(row.get('Definition', '')):
                            text += f" {row['Definition']}"
                        
                        self.condition_embeddings[code] = text
                
                logger.info(f"Loaded {len(self.chapter6_conditions)} Chapter 6 mental health conditions from official ICD-11 dataset")
            else:
                logger.warning(f"ICD-11 dataset not found at {dataset_path}")
                self.chapter6_conditions = pd.DataFrame()
                self.condition_embeddings = {}
                self.condition_texts = {}
                
        except Exception as e:
            logger.error(f"Error loading ICD-11 dataset: {str(e)}")
            self.chapter6_conditions = pd.DataFrame()
            self.condition_embeddings = {}
            self.condition_texts = {}
    
    def _load_database_mappings(self):
        """Load mental health mappings from database"""
        try:
            self.db_mappings = {}
            mappings = ICD11Mapping.objects.filter(
                Q(code__startswith='6') | Q(code__startswith='MB'),
                is_active=True
            ).values('code', 'description', 'local_terms', 'confidence_score', 'source')
            
            for mapping in mappings:
                code = mapping['code']
                self.db_mappings[code] = {
                    'code': code,
                    'name': mapping['description'],
                    'local_terms': mapping['local_terms'],
                    'confidence_score': mapping['confidence_score'],
                    'source': mapping['source']
                }
            
            logger.info(f"Loaded {len(self.db_mappings)} mental health mappings from database")
            
        except Exception as e:
            logger.error(f"Error loading database mappings: {str(e)}")
            self.db_mappings = {}
    
    def load_bert_model(self):
        """Load BERT model for enhanced text processing"""
        try:
            if self.bert_loaded:
                return
            
            model_name = "bert-base-multilingual-cased"
            self.bert_tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.bert_model = AutoModel.from_pretrained(model_name)
            
            # Set to evaluation mode
            self.bert_model.eval()
            self.bert_loaded = True
            
            logger.info("BERT model loaded successfully for mental health detection")
            
        except Exception as e:
            logger.error(f"Error loading BERT model: {str(e)}")
            self.bert_loaded = False
    
    def get_text_embedding(self, text: str) -> np.ndarray:
        """Get BERT embedding for text"""
        if not self.bert_loaded:
            self.load_bert_model()
        
        try:
            inputs = self.bert_tokenizer(
                text,
                truncation=True,
                padding=True,
                max_length=512,
                return_tensors="pt"
            )
            
            with torch.no_grad():
                outputs = self.bert_model(**inputs)
                # Use mean pooling of last hidden state
                embeddings = outputs.last_hidden_state.mean(dim=1)
                return embeddings.numpy()
                
        except Exception as e:
            logger.error(f"Error getting text embedding: {str(e)}")
            return np.zeros((1, 768))  # Default BERT embedding size
    
    def detect_mental_health_conditions(self, text: str) -> List[Dict[str, any]]:
        """
        Detect mental health conditions using multiple methods
        """
        if not text or not text.strip():
            return []
        
        text_lower = text.lower().strip()
        detected_conditions = []
        
        # Method 1: Enhanced keyword mappings (most accurate)
        detected_conditions.extend(self._detect_from_enhanced_mappings(text_lower))
        
        # Method 2: BERT-based semantic matching
        detected_conditions.extend(self._detect_with_bert(text))
        
        # Method 3: Database mappings
        detected_conditions.extend(self._detect_from_database(text_lower))
        
        # Method 4: Official ICD-11 dataset search
        detected_conditions.extend(self._detect_from_official_dataset(text_lower))
        
        # Remove duplicates and sort by confidence
        unique_conditions = self._remove_duplicates(detected_conditions)
        return self._sort_by_priority(unique_conditions)
    
    def _detect_from_enhanced_mappings(self, text_lower: str) -> List[Dict[str, any]]:
        """Detect using enhanced keyword mappings"""
        detected_conditions = []
        
        # Check for suicide keywords
        if any(keyword in text_lower for keyword in self.keywords['suicide']):
            detected_conditions.append({
                'condition': 'suicide',
                'icd11_code': '6A72',
                'icd11_name': 'Suicidal ideation',
                'confidence': 'high',
                'confidence_score': 0.95,
                'source': 'enhanced_mapping',
                'risk_level': 'high',
                'interventions': self.enhanced_mental_health_mappings['suicide']['interventions']
            })
        
        # Check for depression keywords
        if any(keyword in text_lower for keyword in self.keywords['depression']):
            detected_conditions.append({
                'condition': 'depression',
                'icd11_code': '6A70',
                'icd11_name': 'Depressive disorder',
                'confidence': 'high',
                'confidence_score': 0.90,
                'source': 'enhanced_mapping',
                'risk_level': 'high',
                'interventions': self.enhanced_mental_health_mappings['severe_depression']['interventions']
            })
        
        # Check for anxiety keywords
        if any(keyword in text_lower for keyword in self.keywords['anxiety']):
            detected_conditions.append({
                'condition': 'anxiety',
                'icd11_code': '6B00',
                'icd11_name': 'Generalised anxiety disorder',
                'confidence': 'high',
                'confidence_score': 0.85,
                'source': 'enhanced_mapping',
                'risk_level': 'moderate',
                'interventions': self.enhanced_mental_health_mappings['anxiety']['interventions']
            })
        
        # Check for stress keywords
        if any(keyword in text_lower for keyword in self.keywords['stress']):
            detected_conditions.append({
                'condition': 'stress',
                'icd11_code': '6B43',
                'icd11_name': 'Adjustment disorder',
                'confidence': 'medium',
                'confidence_score': 0.75,
                'source': 'enhanced_mapping',
                'risk_level': 'low',
                'interventions': self.enhanced_mental_health_mappings['adjustment']['interventions']
            })
        
        # Check for bullying keywords
        if any(keyword in text_lower for keyword in self.keywords['bullying']):
            detected_conditions.append({
                'condition': 'bullying',
                'icd11_code': '6B43',
                'icd11_name': 'Adjustment disorder',
                'confidence': 'medium',
                'confidence_score': 0.80,
                'source': 'enhanced_mapping',
                'risk_level': 'moderate',
                'interventions': self.enhanced_mental_health_mappings['adjustment']['interventions']
            })
        
        return detected_conditions
    
    def _detect_with_bert(self, text: str) -> List[Dict[str, any]]:
        """Detect using BERT semantic matching"""
        if not self.bert_loaded:
            return []
        
        try:
            # Get text embedding
            text_embedding = self.get_text_embedding(text)
            
            # Get condition embeddings
            condition_embeddings = {}
            for code, condition_text in self.condition_embeddings.items():
                condition_embeddings[code] = self.get_text_embedding(condition_text)
            
            # Calculate similarities
            similarities = []
            for code, cond_embedding in condition_embeddings.items():
                similarity = cosine_similarity(text_embedding, cond_embedding)[0][0]
                similarities.append((code, similarity))
            
            # Sort by similarity and get top matches
            similarities.sort(key=lambda x: x[1], reverse=True)
            
            detected_conditions = []
            for code, similarity in similarities[:5]:  # Top 5 matches
                if similarity > 0.3:  # Threshold for relevance
                    detected_conditions.append({
                        'condition': self.condition_texts.get(code, 'Unknown'),
                        'icd11_code': code,
                        'icd11_name': self.condition_texts.get(code, 'Unknown'),
                        'confidence': 'medium' if similarity > 0.5 else 'low',
                        'confidence_score': similarity,
                        'source': 'bert_semantic',
                        'risk_level': self._determine_risk_level_from_condition(self.condition_texts.get(code, '')),
                        'interventions': self._get_interventions_for_condition(self.condition_texts.get(code, ''), 'moderate')
                    })
            
            return detected_conditions
            
        except Exception as e:
            logger.error(f"Error in BERT detection: {str(e)}")
            return []
    
    def _detect_from_database(self, text_lower: str) -> List[Dict[str, any]]:
        """Detect using database mappings"""
        detected_conditions = []
        
        for code, mapping in self.db_mappings.items():
            if mapping['name'].lower() in text_lower:
                risk_level = self._determine_risk_level_from_condition(mapping['name'])
                interventions = self._get_interventions_for_condition(mapping['name'], risk_level)
                
                detected_conditions.append({
                    'condition': mapping['name'],
                    'icd11_code': code,
                    'icd11_name': mapping['name'],
                    'confidence': 'high' if mapping.get('confidence_score', 0) > 0.7 else 'medium',
                    'confidence_score': mapping.get('confidence_score', 0.8),
                    'source': mapping.get('source', 'database'),
                    'risk_level': risk_level,
                    'interventions': interventions
                })
        
        return detected_conditions
    
    def _detect_from_official_dataset(self, text_lower: str) -> List[Dict[str, any]]:
        """Detect using official ICD-11 dataset"""
        detected_conditions = []
        
        # Simple keyword matching against official dataset
        for _, row in self.chapter6_conditions.iterrows():
            if pd.notna(row['Code']) and pd.notna(row['Title']):
                title_lower = row['Title'].lower()
                
                # Check for keyword matches
                if any(word in title_lower for word in text_lower.split() if len(word) > 3):
                    risk_level = self._determine_risk_level_from_condition(row['Title'])
                    interventions = self._get_interventions_for_condition(row['Title'], risk_level)
                    
                    detected_conditions.append({
                        'condition': row['Title'],
                        'icd11_code': row['Code'],
                        'icd11_name': row['Title'],
                        'confidence': 'low',
                        'confidence_score': 0.4,
                        'source': 'official_dataset',
                        'risk_level': risk_level,
                        'interventions': interventions
                    })
        
        return detected_conditions
    
    def _remove_duplicates(self, conditions: List[Dict[str, any]]) -> List[Dict[str, any]]:
        """Remove duplicate conditions based on ICD-11 code"""
        unique_conditions = []
        seen_codes = set()
        
        for condition in conditions:
            if condition['icd11_code'] not in seen_codes:
                unique_conditions.append(condition)
                seen_codes.add(condition['icd11_code'])
        
        return unique_conditions
    
    def _sort_by_priority(self, conditions: List[Dict[str, any]]) -> List[Dict[str, any]]:
        """Sort conditions by risk level and confidence"""
        def sort_key(condition):
            risk_scores = {'high': 3, 'moderate': 2, 'low': 1}
            confidence_scores = {'high': 3, 'medium': 2, 'low': 1}
            
            risk_score = risk_scores.get(condition.get('risk_level', 'low'), 1)
            confidence_score = confidence_scores.get(condition.get('confidence', 'low'), 1)
            
            return (risk_score, confidence_score, condition.get('confidence_score', 0))
        
        return sorted(conditions, key=sort_key, reverse=True)
    
    def _determine_risk_level_from_condition(self, condition_name: str) -> str:
        """Determine risk level based on condition name"""
        condition_lower = condition_name.lower()
        
        # High risk conditions
        high_risk_terms = ['suicide', 'suicidal', 'self-harm', 'self injury', 'psychosis', 'schizophrenia', 'severe']
        if any(term in condition_lower for term in high_risk_terms):
            return 'high'
        
        # Moderate risk conditions
        moderate_risk_terms = ['depression', 'anxiety', 'stress', 'bullying', 'trauma', 'moderate']
        if any(term in condition_lower for term in moderate_risk_terms):
            return 'moderate'
        
        # Default to low risk
        return 'low'
    
    def _get_interventions_for_condition(self, condition_name: str, risk_level: str) -> List[str]:
        """Get intervention recommendations based on condition and risk level"""
        condition_lower = condition_name.lower()
        
        # High risk interventions
        if risk_level == 'high':
            return [
                'Immediate safety assessment and crisis intervention',
                'Referral to emergency mental health services',
                'Safety planning with student and family',
                'Follow-up within 24-48 hours',
                'Consider hospitalization if risk is imminent'
            ]
        
        # Moderate risk interventions
        elif risk_level == 'moderate':
            return [
                'Comprehensive mental health assessment',
                'Cognitive Behavioral Therapy (CBT)',
                'Regular monitoring and check-ins',
                'Family involvement and support',
                'Referral to specialized mental health services'
            ]
        
        # Low risk interventions
        else:
            return [
                'Supportive counseling and psychoeducation',
                'Stress management techniques',
                'Regular check-ins and progress monitoring',
                'Lifestyle modification guidance',
                'Referral to school counselor if needed'
            ]
    
    def get_top_suggestions(self, conditions: List[Dict[str, any]], limit: int = 3) -> List[Dict[str, any]]:
        """Get top suggested diagnoses"""
        return conditions[:limit]

# Global instance
enhanced_mental_health_detector = EnhancedMentalHealthDetector()
