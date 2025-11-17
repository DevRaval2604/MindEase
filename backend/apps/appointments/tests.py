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

class AppointmentAPITests(APITestCase):
    def setUp(self):
        # create users and profiles
        self.client_user = User.objects.create_user(email="client2@example.com", password="StrongPass123!", role=User.Roles.CLIENT)
        self.counsellor_user = User.objects.create_user(email="counsellor2@example.com", password="StrongPass123!", role=User.Roles.COUNSELLOR)
        self.c_profile = CounsellorProfile.objects.create(
            user=self.counsellor_user,
            license_number="LIC-002",
            fees_per_session=Decimal("700.00")
        )

        # make client active so we can login via test client
        self.client_user.is_active = True
        self.client_user.email_verified = True
        self.client_user.save()

        self.login_url = reverse('auth-login')
        # login
        login_res = self.client.post(self.login_url, {"email": self.client_user.email, "password": "StrongPass123!"})
        assert login_res.status_code == 200
        # set cookies for subsequent requests
        self.client.cookies = login_res.cookies

        self.create_url = reverse('appointments:create')
        self.list_url = reverse('appointments:list')
        self.razorpay_create_url = reverse('appointments:razorpay-create-order')
        self.razorpay_verify_url = reverse('appointments:razorpay-verify-payment')
        self.reschedule_url = reverse('appointments:reschedule')
        self.check_avail_url = reverse('appointments:check-availability')

    def test_create_appointment_success(self):
        appt_time = (timezone.now() + timedelta(days=3)).isoformat()
        payload = {
            "counsellor_id": self.counsellor_user.id,
            "appointment_date": appt_time,
            "duration_minutes": 60,
            "notes": "Need help with anxiety"
        }
        res = self.client.post(self.create_url, data=payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", res.data)
        appt = Appointment.objects.get(id=res.data["id"])
        self.assertEqual(appt.client, self.client_user)
        self.assertEqual(appt.counsellor, self.counsellor_user)
        self.assertEqual(appt.amount, self.c_profile.fees_per_session)