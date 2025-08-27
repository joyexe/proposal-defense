"""
Enable fine-tuned BERT model for predictive analytics
"""

from django.core.management.base import BaseCommand
from django.conf import settings
import os
import torch
import json
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Enable fine-tuned BERT model for predictive analytics'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force reload even if already loaded',
        )

    def handle(self, *args, **options):
        try:
            self.stdout.write(
                self.style.SUCCESS('🏥 Enabling Fine-tuned BERT for Predictive Analytics...')
            )
            
            # Check if already loaded
            if hasattr(settings, 'FINE_TUNED_BERT_MODEL') and not options['force']:
                self.stdout.write(
                    self.style.SUCCESS('✅ Fine-tuned BERT model is already loaded!')
                )
                self.stdout.write(f"🏥 Conditions: {len(settings.FINE_TUNED_BERT_LABEL_MAPPING['condition_to_id'])}")
                return
            
            model_path = os.path.join(settings.BASE_DIR, 'analytics', 'models', 'icd11_bert_finetuned')
            
            # Check if model files exist
            if not os.path.exists(model_path):
                self.stdout.write(
                    self.style.ERROR(f'❌ Model directory not found: {model_path}')
                )
                return
            
            if not os.path.exists(os.path.join(model_path, 'config.json')):
                self.stdout.write(
                    self.style.ERROR('❌ Model files not found')
                )
                return
            
            self.stdout.write('🔧 Loading tokenizer...')
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            
            self.stdout.write('🏥 Loading fine-tuned BERT model (this may take a moment)...')
            
            # Load model with memory optimization
            model = AutoModelForSequenceClassification.from_pretrained(
                model_path,
                torch_dtype=torch.float32,
                low_cpu_mem_usage=True,
                trust_remote_code=True
            )
            
            # Load label mapping
            self.stdout.write('🏷️ Loading label mapping...')
            with open(os.path.join(model_path, 'label_mapping.json'), 'r') as f:
                label_mapping = json.load(f)
            
            # Store in Django settings for global access
            setattr(settings, 'FINE_TUNED_BERT_MODEL', model)
            setattr(settings, 'FINE_TUNED_BERT_TOKENIZER', tokenizer)
            setattr(settings, 'FINE_TUNED_BERT_LABEL_MAPPING', label_mapping)
            
            # Test the model
            self.stdout.write('🧪 Testing fine-tuned model...')
            test_text = "Student may lagnat at sakit ng ulo"
            
            inputs = tokenizer(
                test_text,
                truncation=True,
                padding=True,
                max_length=128,
                return_tensors="pt"
            )
            
            model.eval()
            with torch.no_grad():
                outputs = model(**inputs)
                probabilities = torch.softmax(outputs.logits, dim=-1)
                top_probs, top_indices = torch.topk(probabilities, 3, dim=1)
            
            self.stdout.write(f'📝 Test input: "{test_text}"')
            for i in range(3):
                condition_id = top_indices[0][i].item()
                probability = top_probs[0][i].item()
                icd11_code = label_mapping['id_to_condition'].get(str(condition_id), "Unknown")
                self.stdout.write(f'  {i+1}. {icd11_code} ({probability:.2%})')
            
            self.stdout.write(
                self.style.SUCCESS('✅ Fine-tuned BERT model enabled successfully!')
            )
            self.stdout.write(f'🏥 Conditions: {len(label_mapping["condition_to_id"])}')
            self.stdout.write(
                self.style.SUCCESS('🎉 Your predictive analytics now uses the fine-tuned model!')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Failed to enable fine-tuned model: {str(e)}')
            )
            logger.error(f'Fine-tuned model enable error: {str(e)}')
