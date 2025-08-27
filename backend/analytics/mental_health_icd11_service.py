"""
Mental Health ICD-11 Detection Service for Counselor Analytics
Focuses on Chapter 6 mental health conditions with risk assessment and intervention recommendations
"""

import re
import json
import pandas as pd
import numpy as np
import torch
from typing import List, Dict, Tuple
from django.conf import settings
from django.db.models import Q
from analytics.models import ICD11Mapping, ICD11Entity
import logging
import os
from transformers import AutoTokenizer, AutoModel
from sklearn.metrics.pairwise import cosine_similarity
from .medical_database_integration import medical_database_integration

logger = logging.getLogger(__name__)

class MentalHealthICD11Detector:
    """
    Service for detecting ICD-11 mental health conditions (Chapter 6) with risk assessment
    """
    
    def __init__(self):
        # Load mental health mappings from database
        self._load_mental_health_mappings()
        
        # Load ICD-11 dataset for Chapter 6 conditions
        self._load_icd11_dataset()
        
        # Initialize BERT model (lazy loading)
        self.bert_model = None
        self.bert_tokenizer = None
        self.bert_loaded = False
        
        # Enhanced mental health mappings with CORRECT ICD-11 codes from official WHO dataset
        self.mental_health_mappings = {
            # High Risk Conditions (CORRECTED codes)
            'suicide': {
                'code': '6A72', 'name': 'Suicidal ideation', 'risk_level': 'high',
                'interventions': [
                    'Immediate safety assessment and crisis intervention',
                    'Referral to emergency mental health services',
                    'Safety planning with student and family',
                    'Follow-up within 24-48 hours',
                    'Consider hospitalization if risk is imminent'
                ]
            },
            'self_harm': {
                'code': '6A73', 'name': 'Non-suicidal self-injury', 'risk_level': 'high',
                'interventions': [
                    'Safety assessment and harm reduction strategies',
                    'Dialectical Behavior Therapy (DBT) skills training',
                    'Regular monitoring and check-ins',
                    'Family involvement and support',
                    'Referral to specialized mental health services'
                ]
            },
            'severe_depression': {
                'code': '6A70', 'name': 'Depressive disorder', 'risk_level': 'high',
                'interventions': [
                    'Comprehensive depression assessment',
                    'Cognitive Behavioral Therapy (CBT)',
                    'Medication evaluation if indicated',
                    'Regular suicide risk assessment',
                    'Family psychoeducation and support'
                ]
            },
            'psychosis': {
                'code': '6A20', 'name': 'Schizophrenia', 'risk_level': 'high',
                'interventions': [
                    'Immediate psychiatric evaluation',
                    'Medication management',
                    'Family psychoeducation',
                    'Coordinated care with mental health professionals',
                    'Regular monitoring of symptoms'
                ]
            },
            
            # Moderate Risk Conditions (CORRECTED codes)
            'anxiety': {
                'code': '6B00', 'name': 'Generalised anxiety disorder', 'risk_level': 'moderate',
                'interventions': [
                    'Anxiety assessment and psychoeducation',
                    'Relaxation techniques and stress management',
                    'Cognitive Behavioral Therapy (CBT)',
                    'Gradual exposure therapy',
                    'Regular check-ins and progress monitoring'
                ]
            },
            'social_anxiety': {
                'code': '6B04', 'name': 'Social anxiety disorder', 'risk_level': 'moderate',
                'interventions': [
                    'Social anxiety assessment',
                    'Cognitive Behavioral Therapy (CBT)',
                    'Social skills training',
                    'Gradual exposure to social situations',
                    'Support groups and peer support'
                ]
            },
            'mixed_depression_anxiety': {
                'code': '6A73', 'name': 'Mixed depressive and anxiety disorder', 'risk_level': 'moderate',
                'interventions': [
                    'Comprehensive mood and anxiety assessment',
                    'Integrated treatment approach',
                    'Medication evaluation if indicated',
                    'Regular monitoring of both conditions',
                    'Family psychoeducation'
                ]
            },
            'moderate_depression': {
                'code': '6A70.0', 'name': 'Mild depressive episode', 'risk_level': 'moderate',
                'interventions': [
                    'Depression screening and assessment',
                    'Supportive counseling and psychoeducation',
                    'Behavioral activation strategies',
                    'Social support enhancement',
                    'Regular mood monitoring'
                ]
            },
            
            # Low Risk Conditions (CORRECTED codes)
            'adjustment': {
                'code': '6B43', 'name': 'Adjustment disorder', 'risk_level': 'low',
                'interventions': [
                    'Supportive counseling',
                    'Problem-solving skills development',
                    'Social support enhancement',
                    'Regular monitoring',
                    'Gradual return to normal activities'
                ]
            },
            'mild_anxiety': {
                'code': '6B00.0', 'name': 'Generalised anxiety disorder, mild', 'risk_level': 'low',
                'interventions': [
                    'Anxiety education and normalization',
                    'Basic relaxation techniques',
                    'Lifestyle modification recommendations',
                    'Regular check-ins',
                    'Referral to school counselor if needed'
                ]
            }
        }
        
        # High risk keywords that trigger immediate alerts
        self.high_risk_keywords = [
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
        ]
        
        # Moderate risk keywords
        self.moderate_risk_keywords = [
            'depressed', 'depression', 'anxiety', 'anxious', 'stress', 'stressed',
            'sawang sawa na ako', 'wala akong silbi', 'pangit ako', 'walang nagmamahal sa akin',
            'nobody cares', 'hate myself', 'i\'m worthless', 'pagod na pagod ako sa buhay',
            'walang kwenta lahat', 'iniwan ako', 'hindi ako mahalaga', 'ayoko lumabas',
            'wala akong kaibigan', 'di ako mahal ng pamilya ko', 'ayoko makipag-usap kahit kanino',
            'gusto ko mag-isa lang', 'lagi akong malungkot', 'di ko maintindihan sarili ko',
            'takot ako', 'kinakabahan ako araw-araw', 'di ko alam gagawin ko', 'depressed ako',
            'sobrang lungkot', 'naiiyak ako', 'nai-stress ako sobra', 'i feel empty',
            'wala akong gana', 'hindi ako okay', 'not okay', 'broken ako', 'heartbroken',
            'iniwan sa ere', 'gusto ko mawala pero di ko alam paano', 'napapaisip ako sa buhay',
            'nasa dark place ako', 'wala akong pag-asa', 'i hate my life', 'galit ako sa sarili ko',
            'mali lagi ako', 'lahat mali', 'bullying', 'bullied', 'harassment', 'teasing',
            'picked on', 'mean', 'hurt me', 'eating disorder', 'starving', 'binge', 'purge',
            'fat', 'ugly', 'body image'
        ]
        
        # Low risk keywords
        self.low_risk_keywords = [
            'worried', 'sad', 'lonely', 'overwhelmed', 'fear', 'panic', 'tired', 'exhausted',
            'burnout', 'burn out', 'afraid', 'scared', 'terrified', 'nervous', 'nervousness',
            'tense', 'tension', 'frustrated', 'frustration', 'irritated', 'irritation',
            'upset', 'disappointed', 'disappointment', 'hurt', 'pain', 'suffering',
            'struggling', 'struggle', 'difficult', 'difficulty', 'hard', 'challenging',
            'challenge', 'problem', 'problems', 'issue', 'issues', 'concern', 'concerns',
            'trouble', 'troubles', 'nalulungkot ako', 'miss ko siya', 'naiinis ako',
            'nakakainis', 'stressed ako', 'sobrang busy', 'nakakapagod', 'walang gana',
            'tinamad ako', 'nahihirapan ako sa school', 'naiirita ako', 'frustrated',
            'mainit ulo ko', 'bored ako', 'bad trip', 'overwhelmed', 'worried', 'kabado',
            'kaba lang siguro', 'nahihiya ako', 'nangangamba', 'medyo down ako', 'kinda sad',
            'lonely', 'inaantok ako', 'burnout na ako', 'pagod lang siguro', 'nai-stress ako',
            'toxic yung araw ko', 'mabigat pakiramdam ko', 'tinatamad ako gumawa ng school work',
            'ayoko pumasok', 'nahihirapan ako mag-focus', 'wala ako sa mood', 'na-off ako',
            'meh lang', 'hassle', 'tinatamad bumangon', 'need pahinga'
        ]
    
    def _load_mental_health_mappings(self):
        """
        Load mental health specific ICD-11 mappings from the database
        """
        try:
            # Get mental health mappings from database (Chapter 6 codes)
            self.db_mappings = {}
            mappings = ICD11Mapping.objects.filter(
                Q(code__startswith='6') | Q(code__startswith='MB'),  # Chapter 6 and mental health codes
                is_active=True
            ).values('code', 'description', 'local_terms', 'confidence_score', 'source')
            
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
            
            logger.info(f"Loaded {len(self.db_mappings)} mental health ICD-11 mappings from database")
            
        except Exception as e:
            logger.error(f"Error loading mental health database mappings: {str(e)}")
            self.db_mappings = {}
    
    def _load_icd11_dataset(self):
        """
        Load ICD-11 dataset for Chapter 6 mental health conditions
        """
        try:
            # Path to the ICD-11 dataset
            dataset_path = os.path.join(settings.BASE_DIR, '..', 'datasets', 'icd11_conditions.csv')
            
            if os.path.exists(dataset_path):
                # Read the CSV file
                df = pd.read_csv(dataset_path)
                
                # Check if required columns exist
                required_columns = ['Code']
                if not all(col in df.columns for col in required_columns):
                    logger.warning(f"ICD-11 dataset missing required columns: {required_columns}")
                    self.icd11_dataset = {}
                    return
                
                # Filter for Chapter 6 mental health conditions
                # Chapter 6 codes start with '6' and some mental health codes start with 'MB'
                mental_health_conditions = df[
                    (df['Code'].str.startswith('6', na=False)) | 
                    (df['Code'].str.startswith('MB', na=False))
                ].copy()
                
                # Create a dictionary for quick lookup
                self.icd11_dataset = {}
                for _, row in mental_health_conditions.iterrows():
                    code = row['Code']
                    title = row.get('Title', '')
                    definition = ''  # No definition column in the dataset
                    
                    self.icd11_dataset[code] = {
                        'code': code,
                        'title': title,
                        'definition': definition,
                        'full_text': f"{title} {definition}".lower()
                    }
                
                logger.info(f"Loaded {len(self.icd11_dataset)} mental health conditions from ICD-11 dataset")
            else:
                logger.warning(f"ICD-11 dataset not found at {dataset_path}")
                self.icd11_dataset = {}
                
        except Exception as e:
            logger.error(f"Error loading ICD-11 dataset: {str(e)}")
            self.icd11_dataset = {}
    
    def detect_mental_health_conditions(self, text: str) -> List[Dict[str, any]]:
        """
        Detect mental health conditions from text with risk assessment
        
        Args:
            text (str): Text to analyze (appointment reason, documentation, etc.)
            
        Returns:
            List[Dict]: List of detected mental health conditions with risk levels and interventions
        """
        if not text or not text.strip():
            return []
        
        text_lower = text.lower().strip()
        detected_conditions = []
        
        # First, try mental health specific mappings (most accurate)
        detected_conditions.extend(self._detect_from_mental_health_mappings(text_lower))
        
        # Then, try BERT-based semantic matching
        detected_conditions.extend(self.detect_with_bert(text))
        
        # Then, try database mappings
        detected_conditions.extend(self._detect_from_database(text_lower))
        
        # Then, try ICD-11 dataset search (least accurate)
        detected_conditions.extend(self._detect_from_icd11_dataset(text_lower))
        
        # Remove duplicates based on ICD-11 code
        unique_conditions = []
        seen_codes = set()
        for condition in detected_conditions:
            if condition['icd11_code'] not in seen_codes:
                unique_conditions.append(condition)
                seen_codes.add(condition['icd11_code'])
        
        return unique_conditions
    
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
    
    def detect_with_bert(self, text: str) -> List[Dict[str, any]]:
        """Detect mental health conditions using BERT semantic matching"""
        if not self.bert_loaded:
            return []
        
        try:
            # Get text embedding
            text_embedding = self.get_text_embedding(text)
            
            # Get condition embeddings from official dataset
            condition_embeddings = {}
            for code, condition_data in self.icd11_dataset.items():
                if condition_data.get('title'):
                    condition_embeddings[code] = self.get_text_embedding(condition_data['title'])
            
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
                    condition_data = self.icd11_dataset.get(code, {})
                    condition_title = condition_data.get('title', 'Unknown')
                    
                    # Auto-determine risk level and interventions
                    risk_level = self._determine_risk_level_from_condition(condition_title, code)
                    interventions = self._get_interventions_for_condition(condition_title, risk_level, code)
                    
                    detected_conditions.append({
                        'condition': condition_title,
                        'icd11_code': code,
                        'icd11_name': condition_title,
                        'confidence': 'medium' if similarity > 0.5 else 'low',
                        'confidence_score': similarity,
                        'source': 'bert_semantic',
                        'risk_level': risk_level,
                        'interventions': interventions
                    })
            
            return detected_conditions
            
        except Exception as e:
            logger.error(f"Error in BERT detection: {str(e)}")
            return []
    
    def _detect_from_database(self, text_lower: str) -> List[Dict[str, any]]:
        """
        Detect conditions using database mappings
        """
        detected_conditions = []
        
        # Check for exact matches in database mappings
        for code, mapping in self.db_mappings.items():
            if mapping['name'].lower() in text_lower:
                # Auto-determine risk level based on condition type and ICD-11 code
                risk_level = self._determine_risk_level_from_condition(mapping['name'], code)
                interventions = self._get_interventions_for_condition(mapping['name'], risk_level, code)
                
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
    
    def _detect_from_icd11_dataset(self, text_lower: str) -> List[Dict[str, any]]:
        """
        Detect conditions using ICD-11 dataset search
        """
        detected_conditions = []
        
        # Split text into words for better matching
        text_words = set(text_lower.split())
        
        for code, condition_data in self.icd11_dataset.items():
            title_lower = condition_data['title'].lower()
            definition_lower = condition_data['definition'].lower()
            full_text_lower = condition_data['full_text']
            
            # Calculate match score based on word overlap
            title_words = set(title_lower.split())
            definition_words = set(definition_lower.split())
            
            # Check for keyword matches
            title_match_score = len(text_words.intersection(title_words)) / max(len(title_words), 1)
            definition_match_score = len(text_words.intersection(definition_words)) / max(len(definition_words), 1)
            
            # Check for exact phrase matches
            exact_title_match = title_lower in text_lower
            exact_definition_match = any(word in text_lower for word in definition_words if len(word) > 3)
            
            # Determine if this condition matches
            if (title_match_score > 0.3 or definition_match_score > 0.2 or 
                exact_title_match or exact_definition_match):
                
                # Calculate confidence score
                confidence_score = max(title_match_score, definition_match_score)
                if exact_title_match:
                    confidence_score = 0.9
                elif exact_definition_match:
                    confidence_score = 0.8
                
                # Auto-determine risk level and interventions
                risk_level = self._determine_risk_level_from_condition(condition_data['title'], code)
                interventions = self._get_interventions_for_condition(condition_data['title'], risk_level, code)
                
                detected_conditions.append({
                    'condition': condition_data['title'],
                    'icd11_code': code,
                    'icd11_name': condition_data['title'],
                    'confidence': 'high' if confidence_score > 0.7 else 'medium' if confidence_score > 0.4 else 'low',
                    'confidence_score': confidence_score,
                    'source': 'icd11_dataset',
                    'risk_level': risk_level,
                    'interventions': interventions
                })
        
        return detected_conditions
    
    def _detect_from_mental_health_mappings(self, text_lower: str) -> List[Dict[str, any]]:
        """
        Detect conditions using mental health specific mappings
        """
        detected_conditions = []
        
        # Check for suicide and self-harm keywords first (highest priority)
        if any(keyword in text_lower for keyword in ['suicide', 'kill myself', 'want to die', 'end my life', 'magpapakamatay', 'gusto ko mamatay']):
            icd11_code = '6A72'
            condition_name = 'Suicidal ideation'
            risk_level = self._determine_risk_level_from_condition(condition_name, icd11_code)
            interventions = self._get_interventions_for_condition(condition_name, risk_level, icd11_code)
            
            detected_conditions.append({
                'condition': 'suicide',
                'icd11_code': icd11_code,
                'icd11_name': condition_name,
                'confidence': 'high',
                'confidence_score': 0.95,
                'source': 'mental_health_mapping',
                'risk_level': risk_level,
                'interventions': interventions
            })
        
        # Check for self-harm keywords
        if any(keyword in text_lower for keyword in ['self-harm', 'self harm', 'cut myself', 'hurt myself']):
            icd11_code = '6A73'
            condition_name = 'Non-suicidal self-injury'
            risk_level = self._determine_risk_level_from_condition(condition_name, icd11_code)
            interventions = self._get_interventions_for_condition(condition_name, risk_level, icd11_code)
            
            detected_conditions.append({
                'condition': 'self_harm',
                'icd11_code': icd11_code,
                'icd11_name': condition_name,
                'confidence': 'high',
                'confidence_score': 0.90,
                'source': 'mental_health_mapping',
                'risk_level': risk_level,
                'interventions': interventions
            })
        
        # Check for depression keywords
        if any(keyword in text_lower for keyword in ['depressed', 'depression', 'sad', 'hopeless', 'worthless', 'empty', 'lungkot', 'walang gana']):
            icd11_code = '6A70'
            condition_name = 'Depressive disorder'
            risk_level = self._determine_risk_level_from_condition(condition_name, icd11_code)
            interventions = self._get_interventions_for_condition(condition_name, risk_level, icd11_code)
            
            detected_conditions.append({
                'condition': 'depression',
                'icd11_code': icd11_code,
                'icd11_name': condition_name,
                'confidence': 'high',
                'confidence_score': 0.85,
                'source': 'mental_health_mapping',
                'risk_level': risk_level,
                'interventions': interventions
            })
        
        # Check for anxiety keywords
        if any(keyword in text_lower for keyword in ['anxiety', 'anxious', 'worried', 'nervous', 'panic', 'fear', 'kabado', 'takot']):
            icd11_code = '6B00'
            condition_name = 'Generalised anxiety disorder'
            risk_level = self._determine_risk_level_from_condition(condition_name, icd11_code)
            interventions = self._get_interventions_for_condition(condition_name, risk_level, icd11_code)
            
            detected_conditions.append({
                'condition': 'anxiety',
                'icd11_code': icd11_code,
                'icd11_name': condition_name,
                'confidence': 'high',
                'confidence_score': 0.85,
                'source': 'mental_health_mapping',
                'risk_level': risk_level,
                'interventions': interventions
            })
        
        # Check for stress keywords
        if any(keyword in text_lower for keyword in ['stress', 'stressed', 'pressure', 'overwhelmed', 'nai-stress', 'sobrang busy']):
            icd11_code = '6B43'
            condition_name = 'Adjustment disorder'
            risk_level = self._determine_risk_level_from_condition(condition_name, icd11_code)
            interventions = self._get_interventions_for_condition(condition_name, risk_level, icd11_code)
            
            detected_conditions.append({
                'condition': 'stress',
                'icd11_code': icd11_code,
                'icd11_name': condition_name,
                'confidence': 'high',
                'confidence_score': 0.80,
                'source': 'mental_health_mapping',
                'risk_level': risk_level,
                'interventions': interventions
            })
        
        # Check for bullying keywords
        if any(keyword in text_lower for keyword in ['bullying', 'bullied', 'harassment', 'teasing', 'picked on']):
            icd11_code = '6B43'
            condition_name = 'Adjustment disorder'
            risk_level = self._determine_risk_level_from_condition(condition_name, icd11_code)
            interventions = self._get_interventions_for_condition(condition_name, risk_level, icd11_code)
            
            detected_conditions.append({
                'condition': 'bullying',
                'icd11_code': icd11_code,
                'icd11_name': condition_name,
                'confidence': 'high',
                'confidence_score': 0.85,
                'source': 'mental_health_mapping',
                'risk_level': risk_level,
                'interventions': interventions
            })
        
        # Check for adjustment disorder (fallback for general stress)
        if any(keyword in text_lower for keyword in ['adjustment', 'difficult', 'hard time', 'challenging', 'nahihirapan']):
            icd11_code = '6B43'
            condition_name = 'Adjustment disorder'
            risk_level = self._determine_risk_level_from_condition(condition_name, icd11_code)
            interventions = self._get_interventions_for_condition(condition_name, risk_level, icd11_code)
            
            detected_conditions.append({
                'condition': 'adjustment',
                'icd11_code': icd11_code,
                'icd11_name': condition_name,
                'confidence': 'medium',
                'confidence_score': 0.70,
                'source': 'mental_health_mapping',
                'risk_level': risk_level,
                'interventions': interventions
            })
        
        return detected_conditions
    
    def _determine_risk_level_from_condition(self, condition_name: str, icd11_code: str = None) -> str:
        """
        Enhanced auto-determine risk level based on condition name, ICD-11 code, and clinical guidelines
        """
        condition_lower = condition_name.lower()
        
        # HIGH RISK CONDITIONS (Immediate attention required)
        high_risk_terms = [
            'suicide', 'suicidal', 'self-harm', 'self injury', 'self-injury', 'self harm',
            'psychosis', 'schizophrenia', 'severe', 'acute', 'crisis', 'emergency',
            'manic', 'bipolar', 'psychotic', 'delusion', 'hallucination', 'paranoia',
            'catatonia', 'mania', 'manic episode', 'psychotic episode', 'acute psychosis'
        ]
        
        # HIGH RISK ICD-11 codes (Based on WHO guidelines and clinical severity)
        high_risk_codes = [
            # Suicide and self-harm (6A7)
            '6A72', '6A73', '6A74', '6A75', '6A76', '6A77', '6A78', '6A79', '6A7A', '6A7B', '6A7C', '6A7D', '6A7E', '6A7F', '6A7G', '6A7H', '6A7J', '6A7K', '6A7L', '6A7M', '6A7N', '6A7P', '6A7Q', '6A7R', '6A7S', '6A7T', '6A7U', '6A7V', '6A7W', '6A7X', '6A7Y', '6A7Z',
            
            # Schizophrenia and psychotic disorders (6A2)
            '6A20', '6A21', '6A22', '6A23', '6A24', '6A25', '6A26', '6A27', '6A28', '6A29', '6A2A', '6A2B', '6A2C', '6A2D', '6A2E', '6A2F', '6A2G', '6A2H', '6A2J', '6A2K', '6A2L', '6A2M', '6A2N', '6A2P', '6A2Q', '6A2R', '6A2S', '6A2T', '6A2U', '6A2V', '6A2W', '6A2X', '6A2Y', '6A2Z',
            
            # Severe depression variants (6A7)
            '6A70.2', '6A70.3', '6A70.4', '6A70.5', '6A70.6', '6A70.7', '6A70.8', '6A70.9', '6A70.A', '6A70.B', '6A70.C', '6A70.D', '6A70.E', '6A70.F', '6A70.G', '6A70.H', '6A70.J', '6A70.K', '6A70.L', '6A70.M', '6A70.N', '6A70.P', '6A70.Q', '6A70.R', '6A70.S', '6A70.T', '6A70.U', '6A70.V', '6A70.W', '6A70.X', '6A70.Y', '6A70.Z',
            
            # Bipolar disorders (6A6)
            '6A60', '6A61', '6A62', '6A63', '6A64', '6A65', '6A66', '6A67', '6A68', '6A69', '6A6A', '6A6B', '6A6C', '6A6D', '6A6E', '6A6F', '6A6G', '6A6H', '6A6J', '6A6K', '6A6L', '6A6M', '6A6N', '6A6P', '6A6Q', '6A6R', '6A6S', '6A6T', '6A6U', '6A6V', '6A6W', '6A6X', '6A6Y', '6A6Z'
        ]
        
        # Check for high risk
        if any(term in condition_lower for term in high_risk_terms) or (icd11_code and icd11_code in high_risk_codes):
            return 'high'
        
        # MODERATE RISK CONDITIONS (Requires professional assessment)
        moderate_risk_terms = [
            'depression', 'anxiety', 'stress', 'bullying', 'trauma', 'moderate', 'panic',
            'phobia', 'obsessive', 'compulsive', 'eating disorder', 'substance', 'addiction',
            'post-traumatic', 'ptsd', 'adjustment', 'mood disorder', 'personality disorder',
            'social anxiety', 'generalized anxiety', 'panic disorder', 'agoraphobia',
            'specific phobia', 'separation anxiety', 'selective mutism', 'reactive attachment',
            'disinhibited social engagement', 'acute stress', 'complex trauma'
        ]
        
        # MODERATE RISK ICD-11 codes (Based on clinical guidelines)
        moderate_risk_codes = [
            # Depression (6A7)
            '6A70', '6A70.0', '6A70.1', '6A70.A', '6A70.B', '6A70.C', '6A70.D', '6A70.E', '6A70.F', '6A70.G', '6A70.H', '6A70.J', '6A70.K', '6A70.L', '6A70.M', '6A70.N', '6A70.P', '6A70.Q', '6A70.R', '6A70.S', '6A70.T', '6A70.U', '6A70.V', '6A70.W', '6A70.X', '6A70.Y', '6A70.Z',
            
            # Anxiety disorders (6B0)
            '6B00', '6B01', '6B02', '6B03', '6B04', '6B05', '6B06', '6B07', '6B08', '6B09', '6B0A', '6B0B', '6B0C', '6B0D', '6B0E', '6B0F', '6B0G', '6B0H', '6B0J', '6B0K', '6B0L', '6B0M', '6B0N', '6B0P', '6B0Q', '6B0R', '6B0S', '6B0T', '6B0U', '6B0V', '6B0W', '6B0X', '6B0Y', '6B0Z',
            
            # Adjustment disorders (6B4)
            '6B43', '6B44', '6B45', '6B46', '6B47', '6B48', '6B49', '6B4A', '6B4B', '6B4C', '6B4D', '6B4E', '6B4F', '6B4G', '6B4H', '6B4J', '6B4K', '6B4L', '6B4M', '6B4N', '6B4P', '6B4Q', '6B4R', '6B4S', '6B4T', '6B4U', '6B4V', '6B4W', '6B4X', '6B4Y', '6B4Z',
            
            # Eating disorders (6B8)
            '6B80', '6B81', '6B82', '6B83', '6B84', '6B85', '6B86', '6B87', '6B88', '6B89', '6B8A', '6B8B', '6B8C', '6B8D', '6B8E', '6B8F', '6B8G', '6B8H', '6B8J', '6B8K', '6B8L', '6B8M', '6B8N', '6B8P', '6B8Q', '6B8R', '6B8S', '6B8T', '6B8U', '6B8V', '6B8W', '6B8X', '6B8Y', '6B8Z',
            
            # Substance use disorders (6C4)
            '6C40', '6C41', '6C42', '6C43', '6C44', '6C45', '6C46', '6C47', '6C48', '6C49', '6C4A', '6C4B', '6C4C', '6C4D', '6C4E', '6C4F', '6C4G', '6C4H', '6C4J', '6C4K', '6C4L', '6C4M', '6C4N', '6C4P', '6C4Q', '6C4R', '6C4S', '6C4T', '6C4U', '6C4V', '6C4W', '6C4X', '6C4Y', '6C4Z'
        ]
        
        # Check for moderate risk
        if any(term in condition_lower for term in moderate_risk_terms) or (icd11_code and icd11_code in moderate_risk_codes):
            return 'moderate'
        
        # LOW RISK CONDITIONS (Supportive care usually sufficient)
        low_risk_terms = [
            'mild', 'adjustment', 'stress', 'difficulty', 'worry', 'concern',
            'academic stress', 'social stress', 'family stress', 'peer pressure',
            'mild anxiety', 'mild depression', 'mood swings', 'emotional regulation',
            'attention', 'learning', 'developmental', 'behavioral', 'conduct'
        ]
        
        # LOW RISK ICD-11 codes
        low_risk_codes = [
            # Mild conditions
            '6B00.0', '6B00.1', '6A70.0', '6A70.1',  # Mild anxiety and depression
            
            # Adjustment disorders (mild)
            '6B43.0', '6B43.1', '6B44.0', '6B44.1', '6B45.0', '6B45.1',
            
            # Developmental and behavioral (6A0)
            '6A00', '6A01', '6A02', '6A03', '6A04', '6A05', '6A06', '6A07', '6A08', '6A09', '6A0A', '6A0B', '6A0C', '6A0D', '6A0E', '6A0F', '6A0G', '6A0H', '6A0J', '6A0K', '6A0L', '6A0M', '6A0N', '6A0P', '6A0Q', '6A0R', '6A0S', '6A0T', '6A0U', '6A0V', '6A0W', '6A0X', '6A0Y', '6A0Z'
        ]
        
        # Check for low risk
        if any(term in condition_lower for term in low_risk_terms) or (icd11_code and icd11_code in low_risk_codes):
            return 'low'
        
        # Default to moderate risk for unknown conditions (safer approach)
        return 'moderate'
    
    def _get_interventions_for_condition(self, condition_name: str, risk_level: str, icd11_code: str = None) -> List[str]:
        """
        Get evidence-based intervention recommendations from medical databases
        """
        try:
            # Try to get evidence-based interventions from medical databases first
            if icd11_code:
                evidence_based_interventions = medical_database_integration.get_combined_evidence_based_interventions(
                    icd11_code, condition_name
                )
                
                if evidence_based_interventions:
                    logger.info(f"Retrieved {len(evidence_based_interventions)} evidence-based interventions for {condition_name}")
                    return evidence_based_interventions
            
            # Fallback to auto-generated interventions if medical database fails
            return self._get_auto_generated_interventions(condition_name, risk_level, icd11_code)
            
        except Exception as e:
            logger.error(f"Error getting evidence-based interventions: {str(e)}")
            return self._get_auto_generated_interventions(condition_name, risk_level, icd11_code)
    
    def _get_auto_generated_interventions(self, condition_name: str, risk_level: str, icd11_code: str = None) -> List[str]:
        """
        Auto-generate intervention recommendations based on condition, risk level, and ICD-11 code
        """
        condition_lower = condition_name.lower()
        
        # Auto-generate interventions based on condition type and risk level
        interventions = []
        
        # High risk interventions (auto-generated)
        if risk_level == 'high':
            base_interventions = [
                'Immediate safety assessment and crisis intervention',
                'Referral to emergency mental health services',
                'Safety planning with student and family',
                'Follow-up within 24-48 hours',
                'Consider hospitalization if risk is imminent'
            ]
            
            # Add condition-specific interventions
            if any(term in condition_lower for term in ['suicide', 'suicidal', 'self-harm']):
                interventions = base_interventions + [
                    'Dialectical Behavior Therapy (DBT) skills training',
                    'Regular suicide risk assessment',
                    'Crisis hotline information and support'
                ]
            elif any(term in condition_lower for term in ['psychosis', 'schizophrenia', 'psychotic']):
                interventions = base_interventions + [
                    'Medication management and monitoring',
                    'Family psychoeducation and support',
                    'Coordinated care with mental health professionals'
                ]
            elif any(term in condition_lower for term in ['severe depression', 'major depression']):
                interventions = base_interventions + [
                    'Comprehensive depression assessment',
                    'Medication evaluation if indicated',
                    'Regular suicide risk assessment'
                ]
            else:
                interventions = base_interventions
        
        # Moderate risk interventions (auto-generated)
        elif risk_level == 'moderate':
            base_interventions = [
                'Comprehensive mental health assessment',
                'Cognitive Behavioral Therapy (CBT)',
                'Regular monitoring and check-ins',
                'Family involvement and support',
                'Referral to specialized mental health services'
            ]
            
            # Add condition-specific interventions
            if any(term in condition_lower for term in ['anxiety', 'panic', 'phobia']):
                interventions = base_interventions + [
                    'Relaxation techniques and stress management',
                    'Gradual exposure therapy',
                    'Anxiety education and normalization'
                ]
            elif any(term in condition_lower for term in ['depression', 'mood']):
                interventions = base_interventions + [
                    'Behavioral activation strategies',
                    'Social support enhancement',
                    'Regular mood monitoring'
                ]
            elif any(term in condition_lower for term in ['trauma', 'ptsd', 'post-traumatic']):
                interventions = base_interventions + [
                    'Trauma-informed counseling',
                    'Eye Movement Desensitization and Reprocessing (EMDR)',
                    'Safety and stabilization techniques'
                ]
            elif any(term in condition_lower for term in ['bullying', 'harassment']):
                interventions = base_interventions + [
                    'Safety planning and school intervention',
                    'Social skills development',
                    'School-based anti-bullying programs'
                ]
            else:
                interventions = base_interventions
        
        # Low risk interventions (auto-generated)
        else:
            base_interventions = [
                'Supportive counseling and psychoeducation',
                'Stress management techniques',
                'Regular check-ins and progress monitoring',
                'Lifestyle modification guidance',
                'Referral to school counselor if needed'
            ]
            
            # Add condition-specific interventions
            if any(term in condition_lower for term in ['adjustment', 'stress', 'difficulty']):
                interventions = base_interventions + [
                    'Problem-solving skills development',
                    'Social support enhancement',
                    'Gradual return to normal activities'
                ]
            elif any(term in condition_lower for term in ['mild anxiety', 'worry']):
                interventions = base_interventions + [
                    'Basic relaxation techniques',
                    'Lifestyle modification recommendations',
                    'Anxiety education and normalization'
                ]
            else:
                interventions = base_interventions
        
        # Return top 5 most relevant interventions
        return interventions[:5]
    
    def _auto_generate_interventions_from_medical_database(self, icd11_code: str, condition_name: str) -> List[str]:
        """
        Auto-generate interventions from medical database/literature
        This is a placeholder for future integration with medical databases
        """
        # This would connect to medical databases like PubMed, WHO guidelines, etc.
        # For now, return enhanced interventions based on ICD-11 code patterns
        
        interventions = []
        
        # Auto-generate based on ICD-11 code patterns
        if icd11_code.startswith('6A7'):  # Suicide and self-harm
            interventions = [
                'Immediate safety assessment and crisis intervention',
                'Dialectical Behavior Therapy (DBT) skills training',
                'Safety planning with student and family',
                'Regular suicide risk assessment',
                'Crisis hotline information and support'
            ]
        elif icd11_code.startswith('6A2'):  # Schizophrenia and psychotic disorders
            interventions = [
                'Immediate psychiatric evaluation',
                'Medication management and monitoring',
                'Family psychoeducation and support',
                'Coordinated care with mental health professionals',
                'Regular monitoring of symptoms'
            ]
        elif icd11_code.startswith('6A7'):  # Depressive disorders
            interventions = [
                'Comprehensive depression assessment',
                'Cognitive Behavioral Therapy (CBT)',
                'Medication evaluation if indicated',
                'Regular suicide risk assessment',
                'Family psychoeducation and support'
            ]
        elif icd11_code.startswith('6B0'):  # Anxiety disorders
            interventions = [
                'Anxiety assessment and psychoeducation',
                'Relaxation techniques and stress management',
                'Cognitive Behavioral Therapy (CBT)',
                'Gradual exposure therapy',
                'Regular check-ins and progress monitoring'
            ]
        elif icd11_code.startswith('6B4'):  # Adjustment disorders
            interventions = [
                'Supportive counseling and psychoeducation',
                'Problem-solving skills development',
                'Social support enhancement',
                'Regular monitoring and check-ins',
                'Gradual return to normal activities'
            ]
        else:
            # Default interventions for unknown conditions
            interventions = [
                'Comprehensive mental health assessment',
                'Supportive counseling and psychoeducation',
                'Regular monitoring and check-ins',
                'Family involvement and support',
                'Referral to specialized mental health services'
            ]
        
        return interventions
    
    def _get_keywords_for_condition(self, condition_key: str) -> List[str]:
        """
        Get keywords associated with a specific condition
        """
        if condition_key == 'suicide':
            return self.high_risk_keywords
        elif condition_key in ['anxiety', 'moderate_depression', 'stress']:
            return self.moderate_risk_keywords
        else:
            return self.low_risk_keywords
    
    def assess_risk_level(self, text: str) -> Dict[str, any]:
        """
        Assess overall risk level from text
        
        Args:
            text (str): Text to analyze
            
        Returns:
            Dict: Risk assessment with level, score, and recommendations
        """
        text_lower = text.lower()
        risk_score = 0
        detected_keywords = []
        
        # Check high risk keywords
        high_risk_found = [keyword for keyword in self.high_risk_keywords if keyword in text_lower]
        if high_risk_found:
            risk_score += 10
            detected_keywords.extend(high_risk_found)
        
        # Check moderate risk keywords
        moderate_risk_found = [keyword for keyword in self.moderate_risk_keywords if keyword in text_lower]
        if moderate_risk_found:
            risk_score += 5
            detected_keywords.extend(moderate_risk_found)
        
        # Check low risk keywords
        low_risk_found = [keyword for keyword in self.low_risk_keywords if keyword in text_lower]
        if low_risk_found:
            risk_score += 2
            detected_keywords.extend(low_risk_found)
        
        # Determine risk level
        if risk_score >= 10:
            risk_level = 'high'
            recommendations = [
                'Immediate safety assessment required',
                'Schedule follow-up within 1 week',
                'Consider referral to emergency mental health services',
                'Family notification and involvement',
                'Regular monitoring and check-ins'
            ]
        elif risk_score >= 5:
            risk_level = 'moderate'
            recommendations = [
                'Comprehensive mental health assessment',
                'Schedule follow-up within 2 weeks',
                'Consider referral to mental health specialist',
                'Family involvement recommended',
                'Regular progress monitoring'
            ]
        else:
            risk_level = 'low'
            recommendations = [
                'Supportive counseling and monitoring',
                'Schedule follow-up within 1 month',
                'Provide resources and coping strategies',
                'Regular check-ins as needed',
                'Refer to school counselor if concerns persist'
            ]
        
        return {
            'risk_level': risk_level,
            'risk_score': risk_score,
            'detected_keywords': detected_keywords,
            'recommendations': recommendations
        }
    
    def get_top_suggestions(self, conditions: List[Dict[str, any]], limit: int = 3) -> List[Dict[str, any]]:
        """
        Get top suggested diagnoses with risk levels and interventions
        
        Args:
            conditions (List[Dict]): List of detected conditions
            limit (int): Maximum number of suggestions
            
        Returns:
            List[Dict]: Top suggested diagnoses
        """
        if not conditions:
            return []
        
        # Sort by risk level (high > moderate > low) and confidence
        def sort_key(condition):
            risk_scores = {'high': 3, 'moderate': 2, 'low': 1}
            confidence_scores = {'high': 3, 'medium': 2, 'low': 1}
            
            risk_score = risk_scores.get(condition.get('risk_level', 'low'), 1)
            confidence_score = confidence_scores.get(condition.get('confidence', 'low'), 1)
            
            return (risk_score, confidence_score)
        
        sorted_conditions = sorted(conditions, key=sort_key, reverse=True)
        return sorted_conditions[:limit]
    
    def should_create_follow_up(self, risk_level: str) -> bool:
        """
        Determine if a follow-up appointment should be created
        
        Args:
            risk_level (str): Risk level (high, moderate, low)
            
        Returns:
            bool: True if follow-up should be created
        """
        return risk_level in ['high', 'moderate']
    
    def get_follow_up_timing(self, risk_level: str) -> str:
        """
        Get recommended follow-up timing based on risk level
        
        Args:
            risk_level (str): Risk level (high, moderate, low)
            
        Returns:
            str: Recommended follow-up timing
        """
        if risk_level == 'high':
            return '1 week'
        elif risk_level == 'moderate':
            return '2 weeks'
        else:
            return '1 month'

# Global instance
mental_health_icd11_detector = MentalHealthICD11Detector()
