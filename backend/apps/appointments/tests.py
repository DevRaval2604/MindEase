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

    @patch("apps.appointments.views.razorpay_client")
    def test_create_razorpay_order(self, mock_razorpay):
        # create appointment directly
        appt = Appointment.objects.create(
            client=self.client_user,
            counsellor=self.counsellor_user,
            appointment_date=timezone.now() + timedelta(days=4),
            amount=Decimal("700.00"),
            payment_status=Appointment.PaymentStatus.PENDING
        )
        # mock razorpay order.create
        mock_razorpay.order.create.return_value = {'id': 'order_123', 'amount': 70000, 'currency': 'INR'}
        res = self.client.post(self.razorpay_create_url, {"appointment_id": appt.id}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        appt.refresh_from_db()
        self.assertEqual(appt.razorpay_order_id, 'order_123')
        self.assertIn('order_id', res.data)

    @patch("apps.appointments.views.razorpay_client")
    def test_verify_razorpay_payment_success(self, mock_razorpay):
        # create appointment
        appt = Appointment.objects.create(
            client=self.client_user,
            counsellor=self.counsellor_user,
            appointment_date=timezone.now() + timedelta(days=5),
            amount=Decimal("700.00"),
            payment_status=Appointment.PaymentStatus.PENDING,
            status=Appointment.Status.PENDING
        )
        # create signature using a known secret
        key_secret = "testsecret"
        # Set settings secret for view to pick up
        from django.conf import settings
        settings.RAZORPAY_KEY_SECRET = key_secret

        fake_order_id = "order_abc"
        fake_payment_id = "pay_abc"
        message = f"{fake_order_id}|{fake_payment_id}"
        signature = hmac.new(key_secret.encode(), message.encode(), hashlib.sha256).hexdigest()

        mock_razorpay.payment.fetch.return_value = {'status': 'captured'}
        # make sure client sees appointment belongs to them
        payload = {
            "appointment_id": appt.id,
            "razorpay_order_id": fake_order_id,
            "razorpay_payment_id": fake_payment_id,
            "razorpay_signature": signature
        }
        res = self.client.post(self.razorpay_verify_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        appt.refresh_from_db()
        self.assertEqual(appt.payment_status, Appointment.PaymentStatus.PAID)
        self.assertEqual(appt.status, Appointment.Status.CONFIRMED)

    @patch("apps.appointments.views.razorpay_client")
    def test_verify_razorpay_payment_invalid_signature(self, mock_razorpay):
        appt = Appointment.objects.create(
            client=self.client_user,
            counsellor=self.counsellor_user,
            appointment_date=timezone.now() + timedelta(days=6),
            amount=Decimal("700.00"),
            payment_status=Appointment.PaymentStatus.PENDING,
            status=Appointment.Status.PENDING
        )
        # wrong signature
        payload = {
            "appointment_id": appt.id,
            "razorpay_order_id": "order_x",
            "razorpay_payment_id": "pay_x",
            "razorpay_signature": "invalidsignature"
        }
        res = self.client.post(self.razorpay_verify_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        appt.refresh_from_db()
        self.assertEqual(appt.payment_status, Appointment.PaymentStatus.FAILED)

    def test_list_and_detail_permissions(self):
        # create appointment for client
        appt = Appointment.objects.create(
            client=self.client_user,
            counsellor=self.counsellor_user,
            appointment_date=timezone.now() + timedelta(days=7),
            amount=Decimal("700.00"),
        )
        # list
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(a['id'] == appt.id for a in res.data))

        # detail
        detail_url = reverse('appointments:detail', kwargs={"appointment_id": appt.id})
        res2 = self.client.get(detail_url)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['id'], appt.id)

    def test_reschedule_flow(self):
        appt = Appointment.objects.create(
            client=self.client_user,
            counsellor=self.counsellor_user,
            appointment_date=timezone.now() + timedelta(days=8),
            amount=Decimal("700.00"),
            payment_status=Appointment.PaymentStatus.PAID,
            status=Appointment.Status.CONFIRMED
        )
        new_date = timezone.now() + timedelta(days=10)
        payload = {
            "appointment_id": appt.id,
            "new_appointment_date": new_date.isoformat(),
            "duration_minutes": 45
        }
        res = self.client.post(self.reschedule_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        appt.refresh_from_db()
        self.assertEqual(appt.duration_minutes, 45)
        # appointment_date approximated check
        self.assertTrue(abs((appt.appointment_date - new_date).total_seconds()) < 5)

