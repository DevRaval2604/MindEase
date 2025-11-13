"""
Management command to generate Google Meet links and feedback form URLs for existing appointments.
Run with: python manage.py generate_meet_links
"""
from django.core.management.base import BaseCommand
from django.db import models
from apps.appointments.models import Appointment
from django.conf import settings


class Command(BaseCommand):
    help = 'Generate Google Meet links and feedback form URLs for paid appointments that are missing them'

    def handle(self, *args, **options):
        # Find all paid appointments without Google Meet links or feedback form URLs
        appointments = Appointment.objects.filter(
            payment_status=Appointment.PaymentStatus.PAID
        ).filter(
            models.Q(google_meet_link__isnull=True) | models.Q(google_meet_link='') |
            models.Q(feedback_form_url__isnull=True) | models.Q(feedback_form_url='')
        )
        
        updated_count = 0
        for appointment in appointments:
            # Generate Google Meet link
            if not appointment.google_meet_link:
                meet_code = appointment.generate_meet_code()
                appointment.google_meet_link = f"https://meet.google.com/{meet_code}"
                self.stdout.write(f"Generated Google Meet link for appointment {appointment.id}: {appointment.google_meet_link}")
            
            # Generate feedback form URL
            if not appointment.feedback_form_url:
                default_feedback_url = getattr(settings, 'FEEDBACK_FORM_URL', 'https://docs.google.com/forms/d/e/1FAIpQLSdEXAMPLE/viewform')
                appointment.feedback_form_url = f"{default_feedback_url}?entry.1234567890=appointment_{appointment.id}"
                self.stdout.write(f"Set feedback form URL for appointment {appointment.id}: {appointment.feedback_form_url}")
            
            appointment.save(update_fields=['google_meet_link', 'feedback_form_url'])
            updated_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Successfully updated {updated_count} appointments with Google Meet links and feedback form URLs.'))

