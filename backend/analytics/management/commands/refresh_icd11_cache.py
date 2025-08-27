"""
Django management command to refresh stale ICD-11 cache entries
Usage: python manage.py refresh_icd11_cache [--limit N] [--force]
Can be used as a cron job for weekly maintenance
"""

import logging
from typing import Dict, Any
from django.core.management.base import BaseCommand
from analytics.services import icd11_service

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Refresh stale ICD-11 cache entries from WHO API'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=100,
            help='Maximum number of entities to refresh (default: 100)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force refresh even if API is in cooldown'
        )
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Also cleanup inactive entities'
        )
    
    def handle(self, *args, **options):
        limit = options['limit']
        force = options['force']
        cleanup = options['cleanup']
        
        self.stdout.write(
            self.style.SUCCESS('Starting ICD-11 cache refresh...')
        )
        self.stdout.write(f'Limit: {limit}')
        self.stdout.write(f'Force: {force}')
        self.stdout.write(f'Cleanup: {cleanup}')
        
        try:
            # Get service status before refresh
            status_before = icd11_service.get_service_status()
            self.stdout.write(f"Entities before refresh: {status_before.get('database', {}).get('total_entities', 0)}")
            
            # Refresh stale entities
            refresh_stats = icd11_service.refresh_stale_entities(limit=limit)
            
            self.stdout.write('\n' + '='*40)
            self.stdout.write(self.style.SUCCESS('REFRESH RESULTS'))
            self.stdout.write('='*40)
            self.stdout.write(f'Refreshed: {refresh_stats["refreshed"]}')
            self.stdout.write(f'Failed: {refresh_stats["failed"]}')
            self.stdout.write(f'Total processed: {refresh_stats["total_processed"]}')
            
            # Cleanup if requested
            if cleanup:
                self.stdout.write('\nCleaning up inactive entities...')
                cleaned_count = icd11_service.cleanup_inactive_entities(days_old=30)
                self.stdout.write(f'Cleaned up: {cleaned_count} inactive entities')
            
            # Get final status
            status_after = icd11_service.get_service_status()
            self.stdout.write(f"\nEntities after refresh: {status_after.get('database', {}).get('total_entities', 0)}")
            
            # Summary
            self.stdout.write('\n' + '='*40)
            self.stdout.write(self.style.SUCCESS('CACHE REFRESH COMPLETE'))
            self.stdout.write('='*40)
            
            if refresh_stats['refreshed'] > 0:
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully refreshed {refresh_stats["refreshed"]} entities! 💙')
                )
            else:
                self.stdout.write(
                    self.style.WARNING('No entities were refreshed (may be up to date)')
                )
            
            # Log for monitoring
            logger.info(f"ICD-11 cache refresh completed: {refresh_stats}")
            
        except Exception as e:
            error_msg = f'Error during cache refresh: {str(e)}'
            self.stdout.write(
                self.style.ERROR(error_msg)
            )
            logger.error(error_msg)
            raise
