from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal


class Appointment(models.Model):
    """Appointment model for client-counsellor sessions."""
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'
        COMPLETED = 'completed', 'Completed'
    
    class PaymentStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PAID = 'paid', 'Paid'
        FAILED = 'failed', 'Failed'
        REFUNDED = 'refunded', 'Refunded'
    
    # Relationships
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='client_appointments'
    )
    counsellor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='counsellor_appointments'
    )
    
    # Appointment details
    appointment_date = models.DateTimeField('appointment date and time')
    duration_minutes = models.IntegerField('duration in minutes', default=60)
    
    # Payment details
    amount = models.DecimalField(
        'appointment fee',
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    payment_status = models.CharField(
        'payment status',
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING
    )
    razorpay_order_id = models.CharField(
        'Razorpay order ID',
        max_length=255,
        blank=True,
        null=True
    )
    razorpay_payment_id = models.CharField(
        'Razorpay payment ID',
        max_length=255,
        blank=True,
        null=True
    )
    razorpay_signature = models.CharField(
        'Razorpay signature',
        max_length=255,
        blank=True,
        null=True
    )
    
    # Session details
    status = models.CharField(
        'appointment status',
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    google_meet_link = models.URLField(
        'Google Meet link',
        blank=True,
        null=True
    )
    notes = models.TextField('notes', blank=True, null=True)
    
    # Feedback
    feedback_submitted = models.BooleanField('feedback submitted', default=False)
    feedback_submitted_at = models.DateTimeField('feedback submitted at', blank=True, null=True)
    feedback_form_url = models.URLField('feedback form URL', blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField('created at', auto_now_add=True)
    updated_at = models.DateTimeField('updated at', auto_now=True)
    
    class Meta:
        verbose_name = 'Appointment'
        verbose_name_plural = 'Appointments'
        ordering = ['-appointment_date']
        indexes = [
            models.Index(fields=['client', 'appointment_date']),
            models.Index(fields=['counsellor', 'appointment_date']),
            models.Index(fields=['payment_status']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.client.email} - {self.counsellor.email} - {self.appointment_date}"
    
    @property
    def is_paid(self):
        return self.payment_status == self.PaymentStatus.PAID
    
    @property
    def is_upcoming(self):
        return self.appointment_date > timezone.now() and self.status == self.Status.CONFIRMED
    
    @property
    def is_past(self):
        return self.appointment_date < timezone.now()
    
    def can_join_meet(self):
        """Check if user can join Google Meet (only on appointment date)."""
        if not self.google_meet_link or not self.is_paid:
            return False
        now = timezone.now()
        appointment_date = self.appointment_date.date()
        today = now.date()
        return appointment_date == today and self.status == self.Status.CONFIRMED
    
    def generate_meet_code(self):
        """Generate a simple Google Meet code (in production, use Google Calendar API)."""
        import random
        import string
        # Generate a random meet code (Google Meet format: abc-defg-hij)
        code = ''.join(random.choices(string.ascii_lowercase + string.digits, k=12))
        return f"{code[:3]}-{code[3:7]}-{code[7:]}"

