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