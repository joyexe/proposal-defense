"""
BERT Fine-tuning for ICD-11 Medical Classification
Fine-tunes BERT model for medical condition classification
"""

import os
import json
import torch
import numpy as np
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification, 
    TrainingArguments, 
    Trainer,
    EarlyStoppingCallback
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import logging

logger = logging.getLogger(__name__)

class ICD11Dataset(Dataset):
    """Dataset for ICD-11 medical condition classification"""
    
    def __init__(self, texts, labels, tokenizer, max_length=512):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long)
        }

class ICD11BERTFineTuner:
    """BERT fine-tuner for ICD-11 medical classification"""
    
    def __init__(self, model_name="bert-base-multilingual-cased", num_labels=None):
        self.model_name = model_name
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.num_labels = num_labels or 27  # Default to number of enhanced mappings
        
        # Add special tokens for medical context
        special_tokens = {
            'additional_special_tokens': [
                '[PAIN]', '[FEVER]', '[COUGH]', '[NAUSEA]', '[HEADACHE]',
                '[STOMACH]', '[RESPIRATORY]', '[GASTRO]', '[SKIN]', '[EYE]'
            ]
        }
        self.tokenizer.add_special_tokens(special_tokens)
        
        # Initialize model
        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            num_labels=self.num_labels,
            ignore_mismatched_sizes=True
        )
        
        # Resize token embeddings
        self.model.resize_token_embeddings(len(self.tokenizer))
        
        # Label mapping
        self.label_to_id = {}
        self.id_to_label = {}
        
    def prepare_training_data(self):
        """Prepare training data from enhanced mappings and medical dataset"""
        
        # Enhanced mappings data
        enhanced_mappings = {
            'fever': {
                'code': 'MD90.0', 
                'name': 'Fever',
                'local_terms': ['lagnat', 'init', 'mainit', 'fever', 'high temperature'],
                'confidence': 0.95
            },
            'headache': {
                'code': '8A80.0', 
                'name': 'Headache',
                'local_terms': ['sakit ng ulo', 'head pain', 'migraine', 'head ache'],
                'confidence': 0.95
            },
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
            'stomach ache': {
                'code': 'DA92.0', 
                'name': 'Abdominal pain',
                'local_terms': ['sakit ng tiyan', 'stomach pain', 'abdominal pain', 'belly ache'],
                'confidence': 0.90
            },
            'nausea': {
                'code': 'MD90.1', 
                'name': 'Nausea',
                'local_terms': ['nausea', 'feeling sick', 'queasy'],
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
            'fatigue': {
                'code': 'MD90.4', 
                'name': 'Fatigue',
                'local_terms': ['pagod', 'fatigue', 'tired', 'exhausted'],
                'confidence': 0.85
            },
            'rash': {
                'code': 'ED60.0', 
                'name': 'Rash',
                'local_terms': ['pantal', 'rash', 'skin rash', 'eruption'],
                'confidence': 0.90
            },
            'eye pain': {
                'code': '9A00.0', 
                'name': 'Eye disorder',
                'local_terms': ['sakit ng mata', 'eye pain', 'eye irritation'],
                'confidence': 0.85
            },
            'ear pain': {
                'code': 'AB30.0', 
                'name': 'Ear pain',
                'local_terms': ['sakit ng tenga', 'ear pain', 'earache'],
                'confidence': 0.90
            },
            'toothache': {
                'code': 'DA01.0', 
                'name': 'Dental disorder',
                'local_terms': ['sakit ng ngipin', 'toothache', 'dental pain'],
                'confidence': 0.95
            },
            'allergy': {
                'code': '4A84.Z', 
                'name': 'Allergy',
                'local_terms': ['allergy', 'allergic', 'allergic reaction'],
                'confidence': 0.85
            },
            'menstrual': {
                'code': 'GA34.0', 
                'name': 'Menstrual disorder',
                'local_terms': ['menstrual', 'period', 'cramps', 'dysmenorrhea'],
                'confidence': 0.90
            },
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
        
        # Create label mapping
        conditions = list(enhanced_mappings.keys())
        for i, condition in enumerate(conditions):
            self.label_to_id[condition] = i
            self.id_to_label[i] = condition
        
        # Generate training data
        texts = []
        labels = []
        
        # Generate synthetic training data from enhanced mappings
        for condition, data in enhanced_mappings.items():
            label_id = self.label_to_id[condition]
            
            # Add condition name
            texts.append(data['name'])
            labels.append(label_id)
            
            # Add local terms
            for term in data['local_terms']:
                texts.append(term)
                labels.append(label_id)
            
            # Add combinations
            for term in data['local_terms'][:3]:  # Use first 3 terms
                # Simple combinations
                texts.append(f"Patient has {term}")
            labels.append(label_id)
            
                texts.append(f"Student may {term}")
                labels.append(label_id)
                
                texts.append(f"Complains of {term}")
                labels.append(label_id)
        
        # Add some negative examples (general consultation)
        general_texts = [
            "General checkup",
            "Routine examination",
            "Health assessment",
            "Medical consultation",
            "Wellness check"
        ]
        for text in general_texts:
            texts.append(text)
            labels.append(26)  # General consultation label
        
        # Split into train and eval
        train_texts, eval_texts, train_labels, eval_labels = train_test_split(
            texts, labels, test_size=0.2, random_state=42, stratify=labels
        )
        
        # Create datasets
        train_dataset = ICD11Dataset(train_texts, train_labels, self.tokenizer)
        eval_dataset = ICD11Dataset(eval_texts, eval_labels, self.tokenizer)
        
        return train_dataset, eval_dataset
    
    def fine_tune(self, train_dataset, eval_dataset, output_dir, num_epochs=3, batch_size=8, learning_rate=2e-5):
        """Fine-tune the BERT model"""
        
        # Training arguments - optimized for stability
        training_args = TrainingArguments(
            output_dir=output_dir,
            num_train_epochs=num_epochs,
            per_device_train_batch_size=batch_size,
            per_device_eval_batch_size=batch_size,
            warmup_steps=100,  # Reduced for smaller dataset
            weight_decay=0.01,
            logging_dir=f"{output_dir}/logs",
            logging_steps=5,  # More frequent logging
            eval_strategy="steps",  # Changed to steps for more frequent evaluation
            eval_steps=50,  # Evaluate every 50 steps
            save_strategy="epoch",
            load_best_model_at_end=True,
            metric_for_best_model="eval_accuracy",
            greater_is_better=True,
            learning_rate=learning_rate,
            save_total_limit=2,
            remove_unused_columns=False,
            dataloader_num_workers=0,  # Disable multiprocessing for stability
            fp16=False,  # Disable mixed precision for CPU
            report_to=None,  # Disable wandb logging
        )
        
        # Initialize trainer with simplified configuration
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            compute_metrics=self._compute_metrics,
        )
        
        # Train the model
        trainer.train()
        
        # Save the model and tokenizer
        trainer.save_model()
        self.tokenizer.save_pretrained(output_dir)
        
        # Save label mapping
        label_mapping = {
            'label_to_id': self.label_to_id,
            'id_to_label': self.id_to_label
        }
        with open(os.path.join(output_dir, 'label_mapping.json'), 'w') as f:
            json.dump(label_mapping, f, indent=2)
        return trainer
    
    def _compute_metrics(self, pred):
        """Compute evaluation metrics"""
        labels = pred.label_ids
        preds = pred.predictions.argmax(-1)
        precision, recall, f1, _ = precision_recall_fscore_support(labels, preds, average='weighted')
        acc = accuracy_score(labels, preds)
        return {
            'accuracy': acc,
            'f1': f1,
            'precision': precision,
            'recall': recall
        }

def main():
    """Main function to run fine-tuning"""
    
    # Create output directory
    output_dir = os.path.join(os.path.dirname(__file__), 'models', 'icd11_bert_finetuned')
    os.makedirs(output_dir, exist_ok=True)
    
    # Initialize fine-tuner
    fine_tuner = ICD11BERTFineTuner()
    
    # Prepare data
    train_dataset, eval_dataset = fine_tuner.prepare_training_data()
    
    # Run fine-tuning
    trainer = fine_tuner.fine_tune(train_dataset, eval_dataset, output_dir, num_epochs=3, batch_size=8, learning_rate=2e-5)
    
    # Evaluate final model
    results = trainer.evaluate()

if __name__ == "__main__":
    main()

