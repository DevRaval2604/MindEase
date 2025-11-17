from datetime import timedelta
import hmac
import hashlib
from decimal import Decimal
from unittest.mock import patch

from django.urls import reverse
from django.utils import timezone
from django.test import TestCase, override_settings
from rest_framework.test import APITestCase
from rest_framework import status

from apps.accounts.models import User, CounsellorProfile, ClientProfile, Specialization, AvailabilitySlot, UnavailableDate
from .models import Appointment


class AppointmentModelUnitTests(TestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(email="client1@example.com", password="StrongPass123!", role=User.Roles.CLIENT)
        self.counsellor_user = User.objects.create_user(email="counsellor1@example.com", password="StrongPass123!", role=User.Roles.COUNSELLOR)

        self.c_profile = CounsellorProfile.objects.create(
            user=self.counsellor_user,
            license_number="LIC-001",
            fees_per_session=Decimal("500.00")
        )

    def test_generate_meet_code_format(self):
        appt = Appointment.objects.create(
            client=self.client_user,
            counsellor=self.counsellor_user,
            appointment_date=timezone.now() + timedelta(days=1),
            amount=self.c_profile.fees_per_session
        )
        code = appt.generate_meet_code()
        # Expect pattern xxx-xxxx-xxxx (length and hyphens)
        assert isinstance(code, str)
        assert code.count("-") == 2

    def test_is_paid_and_upcoming_properties(self):
        appt = Appointment.objects.create(
            client=self.client_user,
            counsellor=self.counsellor_user,
            appointment_date=timezone.now() + timedelta(days=2),
            amount=Decimal("400.00"),
            payment_status=Appointment.PaymentStatus.PAID,
            status=Appointment.Status.CONFIRMED
        )
        self.assertTrue(appt.is_paid)
        self.assertTrue(appt.is_upcoming)
        self.assertFalse(appt.is_past)
