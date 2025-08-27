"""
Django management command to import ICD-11 physical health data from CSV
Usage: python manage.py import_icd11_physical_csv [--file path] [--limit N] [--force]
"""

import csv
import logging
import os
from typing import Dict, List, Optional
from django.core.management.base import BaseCommand
from django.db import transaction
from django.conf import settings
from analytics.models import ICD11Entity, ICD11Mapping

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Import ICD-11 physical health data from CSV file into PostgreSQL database'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='datasets/icd11_conditions.csv',
            help='Path to the CSV file (default: datasets/icd11_conditions.csv)'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Maximum number of records to import (default: all records)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update existing entities'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Batch size for database operations (default: 1000)'
        )
    
    def handle(self, *args, **options):
        file_path = options['file']
        limit = options['limit']
        force_update = options['force']
        batch_size = options['batch_size']
        
        # Validate file path
        if not os.path.exists(file_path):
            self.stdout.write(
                self.style.ERROR(f'File not found: {file_path}')
            )
            return
        
        self.stdout.write(
            self.style.SUCCESS(f'Starting ICD-11 physical health data import...')
        )
        self.stdout.write(f'File: {file_path}')
        self.stdout.write(f'Limit: {limit or "All records"}')
        self.stdout.write(f'Force update: {force_update}')
        self.stdout.write(f'Batch size: {batch_size}')
        
        # Import data
        success_count = 0
        error_count = 0
        skipped_count = 0
        total_count = 0
        
        try:
            with open(file_path, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                
                # Process records in batches
                batch_entities = []
                batch_mappings = []
                
                for row in reader:
                    total_count += 1
                    
                    # Apply limit if specified
                    if limit and total_count > limit:
                        break
                    
                    try:
                        # Process the row
                        entity_data, mapping_data = self.process_csv_row(row)
                        
                        if entity_data:
                            batch_entities.append(entity_data)
                        
                        if mapping_data:
                            batch_mappings.append(mapping_data)
                        
                        # Process batch when it reaches the batch size
                        if len(batch_entities) >= batch_size or len(batch_mappings) >= batch_size:
                            success, errors, skipped = self.process_batch(
                                batch_entities, batch_mappings, force_update
                            )
                            success_count += success
                            error_count += errors
                            skipped_count += skipped
                            
                            # Clear batches
                            batch_entities = []
                            batch_mappings = []
                            
                            # Progress update
                            self.stdout.write(f'Progress: {total_count} records processed')
                    
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f'Error processing row {total_count}: {str(e)}')
                        )
                        error_count += 1
                        continue
                
                # Process remaining records in final batch
                if batch_entities or batch_mappings:
                    success, errors, skipped = self.process_batch(
                        batch_entities, batch_mappings, force_update
                    )
                    success_count += success
                    error_count += errors
                    skipped_count += skipped
        
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error reading CSV file: {str(e)}')
            )
            return
        
        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('ICD-11 PHYSICAL HEALTH IMPORT COMPLETE'))
        self.stdout.write('='*60)
        self.stdout.write(f'Total records processed: {total_count}')
        self.stdout.write(f'Successfully imported: {success_count}')
        self.stdout.write(f'Errors: {error_count}')
        self.stdout.write(f'Skipped: {skipped_count}')
        self.stdout.write(f'Total ICD11Entity records: {ICD11Entity.objects.count()}')
        self.stdout.write(f'Total ICD11Mapping records: {ICD11Mapping.objects.count()}')
        
        self.stdout.write(
            self.style.SUCCESS('ICD-11 physical health data import completed successfully! 💙')
        )
    
    def process_csv_row(self, row: Dict) -> tuple:
        """
        Process a single CSV row and return entity and mapping data
        Returns: (entity_data, mapping_data) tuple
        """
        # Extract entity data
        entity_id = row.get('Foundation URI', '').split('/')[-1] if row.get('Foundation URI') else None
        if not entity_id:
            return None, None
        
        # Create entity data
        entity_data = {
            'entity_id': entity_id,
            'json_data': {
                'foundation_uri': row.get('Foundation URI', ''),
                'linearization_uri': row.get('Linearization (release) URI', ''),
                'code': row.get('Code', ''),
                'block_id': row.get('BlockId', ''),
                'title': row.get('Title', ''),
                'class_kind': row.get('ClassKind', ''),
                'depth_in_kind': row.get('DepthInKind', ''),
                'is_residual': row.get('IsResidual', 'FALSE').upper() == 'TRUE',
                'primary_location': row.get('PrimaryLocation', ''),
                'chapter_no': row.get('ChapterNo', ''),
                'browser_link': row.get('BrowserLink', ''),
                'icat_link': row.get('iCatLink', ''),
                'is_leaf': row.get('isLeaf', 'FALSE').upper() == 'TRUE',
                'no_of_non_residual_children': row.get('noOfNonResidualChildren', ''),
                'primary_tabulation': row.get('Primary tabulation', ''),
                'grouping1': row.get('Grouping1', ''),
                'grouping2': row.get('Grouping2', ''),
                'grouping3': row.get('Grouping3', ''),
                'grouping4': row.get('Grouping4', ''),
                'grouping5': row.get('Grouping5', ''),
                'version': row.get('Version:2025 Aug 15 - 22:30 UTC', ''),
            },
            'is_active': True
        }
        
        # Create mapping data for codes with titles
        mapping_data = None
        code = row.get('Code', '').strip()
        title = row.get('Title', '').strip()
        
        if code and title:
            mapping_data = {
                'code': code,
                'description': title,
                'local_terms': {
                    'tagalog': [],
                    'english': [title],
                    'taglish': []
                },
                'confidence_score': 0.8,  # Default confidence for official ICD-11 data
                'source': 'csv_import',
                'is_active': True
            }
        
        return entity_data, mapping_data
    
    def process_batch(self, entities: List[Dict], mappings: List[Dict], force_update: bool) -> tuple:
        """
        Process a batch of entities and mappings
        Returns: (success_count, error_count, skipped_count)
        """
        success_count = 0
        error_count = 0
        skipped_count = 0
        
        try:
            with transaction.atomic():
                # Process entities
                for entity_data in entities:
                    try:
                        existing_entity = ICD11Entity.objects.filter(
                            entity_id=entity_data['entity_id']
                        ).first()
                        
                        if existing_entity and not force_update:
                            skipped_count += 1
                            continue
                        
                        ICD11Entity.objects.update_or_create(
                            entity_id=entity_data['entity_id'],
                            defaults=entity_data
                        )
                        success_count += 1
                    
                    except Exception as e:
                        logger.error(f"Error processing entity {entity_data.get('entity_id')}: {str(e)}")
                        error_count += 1
                
                # Process mappings
                for mapping_data in mappings:
                    try:
                        existing_mapping = ICD11Mapping.objects.filter(
                            code=mapping_data['code']
                        ).first()
                        
                        if existing_mapping and not force_update:
                            skipped_count += 1
                            continue
                        
                        ICD11Mapping.objects.update_or_create(
                            code=mapping_data['code'],
                            defaults=mapping_data
                        )
                        success_count += 1
                    
                    except Exception as e:
                        logger.error(f"Error processing mapping {mapping_data.get('code')}: {str(e)}")
                        error_count += 1
        
        except Exception as e:
            logger.error(f"Error processing batch: {str(e)}")
            error_count += len(entities) + len(mappings)
        
        return success_count, error_count, skipped_count
