from django.urls import reverse
from django.utils import timezone
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status

from .models import (
    User,
    EmailVerificationToken,
    ClientProfile,
    CounsellorProfile,
    Specialization,
    AvailabilitySlot,
)



#  1. UNIT TESTS


class UserModelUnitTests(TestCase):
    def test_create_user_defaults(self):
        user = User.objects.create_user(email="test@example.com", password="Test@123")
        self.assertEqual(user.email, "test@example.com")
        self.assertFalse(user.is_active)  # inactive until email verified
        self.assertIsNotNone(user.password)

    def test_create_superuser(self):
        admin = User.objects.create_superuser(email="admin@example.com", password="Admin@123")
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_active)


class EmailVerificationTokenUnitTests(TestCase):
    def test_token_validity(self):
        user = User.objects.create_user(email="tokentest@example.com", password="Test@123")
        token = EmailVerificationToken.objects.create(
            user=user,
            token_hash="abc",
            expires_at=timezone.now() + timezone.timedelta(hours=1)
        )
        self.assertTrue(token.is_valid())

    def test_token_expired(self):
        user = User.objects.create_user(email="expire@example.com", password="Test@123")
        token = EmailVerificationToken.objects.create(
            user=user,
            token_hash="abc",
            expires_at=timezone.now() - timezone.timedelta(hours=1)
        )
        self.assertFalse(token.is_valid())


class ProfileModelUnitTests(TestCase):
    def test_client_profile_role_validation(self):
        user = User.objects.create_user(email="wrongrole@example.com", password="Test123", role="counsellor")
        profile = ClientProfile(user=user, agreed_terms=True)
        with self.assertRaises(Exception):
            profile.clean()

    def test_counsellor_profile_role_validation(self):
        user = User.objects.create_user(email="client@example.com", password="Test123", role="client")
        profile = CounsellorProfile(user=user, license_number="LIC123", fees_per_session=100)
        with self.assertRaises(Exception):
            profile.clean()

#  2. VALIDATION TESTS


class SignupValidationTests(APITestCase):
    def test_password_mismatch(self):
        url = reverse('auth-signup')
        data = {
            "email": "test@example.com",
            "password": "Pass1234",
            "confirm_password": "Pass5678",
            "account_type": "client",
            "agreed_terms": True
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("confirm_password", response.data)

    def test_duplicate_email(self):
        url = reverse('auth-signup')
        data = {
            "email": "dup@example.com",
            "password": "StrongPass123!",
            "confirm_password": "StrongPass123!",
            "account_type": "client",
            "agreed_terms": True
        }
        # First signup
        self.client.post(url, data, format='json')
        # Second should fail
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_invalid_phone(self):
        url = reverse('auth-signup')
        data = {
            "email": "phone@example.com",
            "password": "Pass1234",
            "confirm_password": "Pass1234",
            "phone": "123",
            "account_type": "client",
            "agreed_terms": True
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn("phone", response.data)