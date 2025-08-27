"""
BERT-based Intent Detection for Mental Health Chatbot
Uses Hugging Face Transformers to detect mental health intents in Tagalog, English, and Taglish
"""

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
import json
import os
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)

class BERTIntentDetector:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.classifier = None
        self.intent_labels = ['high_risk', 'moderate_risk', 'low_risk', 'general']
        self.initialize_model()
        
    def initialize_model(self):
        """Initialize BERT model for intent classification"""
        try:
            # Use a multilingual BERT model that works well with Tagalog and English
            model_name = "bert-base-multilingual-cased"
            
            # Initialize tokenizer and model
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(
                model_name,
                num_labels=len(self.intent_labels)
            )
            
            # Create classification pipeline
            self.classifier = pipeline(
                "text-classification",
                model=self.model,
                tokenizer=self.tokenizer,
                return_all_scores=True
            )
            
            logger.info("BERT model initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize BERT model: {e}")
            # Fallback to rule-based detection
            self.classifier = None
    
    def detect_intent(self, text: str) -> Dict[str, any]:
        """
        Detect mental health intent using BERT model
        
        Args:
            text (str): Input text in Tagalog, English, or Taglish
            
        Returns:
            Dict: Intent detection results with confidence scores
        """
        if not self.classifier or not text.strip():
            return self._fallback_detection(text)
        
        try:
            # Preprocess text
            processed_text = self._preprocess_text(text)
            
            # Get predictions from BERT model
            predictions = self.classifier(processed_text)
            
            # Extract scores for each intent
            scores = predictions[0] if predictions else []
            
            # Map scores to intent labels
            intent_scores = {}
            for i, score in enumerate(scores):
                if i < len(self.intent_labels):
                    intent_scores[self.intent_labels[i]] = score['score']
            
            # Determine primary intent
            primary_intent = max(intent_scores.items(), key=lambda x: x[1])
            
            # Apply confidence threshold
            confidence_threshold = 0.3
            if primary_intent[1] < confidence_threshold:
                # If confidence is low, use fallback detection
                return self._fallback_detection(text)
            
            return {
                'primary_intent': primary_intent[0],
                'confidence': primary_intent[1],
                'all_scores': intent_scores,
                'detection_method': 'bert'
            }
            
        except Exception as e:
            logger.error(f"BERT intent detection failed: {e}")
            return self._fallback_detection(text)
    
    def _preprocess_text(self, text: str) -> str:
        """Preprocess text for BERT model"""
        # Convert to lowercase
        text = text.lower().strip()
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Truncate if too long (BERT has token limits)
        max_length = 512
        if len(text) > max_length:
            text = text[:max_length]
        
        return text
    
    def _fallback_detection(self, text: str) -> Dict[str, any]:
        """
        Fallback to rule-based keyword detection when BERT fails
        """
        from .utils import detect_keywords, analyze_sentiment
        
        # First, analyze sentiment
        sentiment_result = analyze_sentiment(text)
        
        # If positive sentiment is detected, return low_risk intent
        if sentiment_result['sentiment'] == 'positive' and sentiment_result['confidence'] > 0.6:
            return {
                'primary_intent': 'low_risk',
                'confidence': sentiment_result['confidence'],
                'all_scores': {
                    'high_risk': 0.05,
                    'moderate_risk': 0.1,
                    'low_risk': sentiment_result['confidence'],
                    'general': 0.2
                },
                'detection_method': 'sentiment_analysis',
                'sentiment': sentiment_result
            }
        
        # Check for keywords
        flagged_keywords = detect_keywords(text)
        
        if not flagged_keywords:
            # If no keywords detected and sentiment is neutral, return general
            if sentiment_result['sentiment'] == 'neutral':
                return {
                    'primary_intent': 'general',
                    'confidence': 0.5,
                    'all_scores': {'general': 0.5, 'low_risk': 0.3, 'moderate_risk': 0.1, 'high_risk': 0.1},
                    'detection_method': 'sentiment_analysis',
                    'sentiment': sentiment_result
                }
            else:
                # Negative sentiment but no specific keywords
                return {
                    'primary_intent': 'moderate_risk',
                    'confidence': sentiment_result['confidence'],
                    'all_scores': {
                        'high_risk': 0.1,
                        'moderate_risk': sentiment_result['confidence'],
                        'low_risk': 0.2,
                        'general': 0.1
                    },
                    'detection_method': 'sentiment_analysis',
                    'sentiment': sentiment_result
                }
        
        # Map keyword severity to intent
        severity_mapping = {
            'high': 'high_risk',
            'moderate': 'moderate_risk', 
            'low': 'low_risk',
            'positive': 'low_risk'  # Positive emotions are low risk
        }
        
        # Get highest severity keyword
        highest_severity = max(flagged_keywords, key=lambda x: {
            'high': 4, 
            'moderate': 3, 
            'low': 2, 
            'positive': 1
        }[x['severity']])
        
        primary_intent = severity_mapping.get(highest_severity['severity'], 'general')
        
        return {
            'primary_intent': primary_intent,
            'confidence': 0.7,
            'all_scores': {
                'high_risk': 0.3 if primary_intent == 'high_risk' else 0.1,
                'moderate_risk': 0.3 if primary_intent == 'moderate_risk' else 0.1,
                'low_risk': 0.3 if primary_intent == 'low_risk' else 0.1,
                'general': 0.3 if primary_intent == 'general' else 0.1
            },
            'detection_method': 'keyword_fallback',
            'flagged_keywords': flagged_keywords,
            'sentiment': sentiment_result
        }

# Global instance
intent_detector = BERTIntentDetector()

def get_intent_detector() -> BERTIntentDetector:
    """Get the global intent detector instance"""
    return intent_detector
