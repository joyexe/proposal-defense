from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Add section columns to database tables'

    def handle(self, *args, **options):
        self.stdout.write('Adding section columns to database...')
        
        with connection.cursor() as cursor:
            try:
                # Add section column to website_user table
                cursor.execute("""
                    ALTER TABLE website_user 
                    ADD COLUMN section VARCHAR(100) NULL;
                """)
                self.stdout.write(
                    self.style.SUCCESS('✅ Added section column to website_user table')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'⚠️  website_user.section column might already exist: {e}')
                )
            
            try:
                # Add section column to health_records_permitrequest table
                cursor.execute("""
                    ALTER TABLE health_records_permitrequest 
                    ADD COLUMN section VARCHAR(100) NOT NULL DEFAULT '';
                """)
                self.stdout.write(
                    self.style.SUCCESS('✅ Added section column to health_records_permitrequest table')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'⚠️  health_records_permitrequest.section column might already exist: {e}')
                )
            
            # Commit the changes
            connection.commit()
            self.stdout.write(
                self.style.SUCCESS('✅ Database changes committed successfully')
            )
