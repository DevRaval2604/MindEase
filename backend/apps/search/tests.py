from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from apps.accounts.models import User, CounsellorProfile, Specialization


class CounsellorSearchAPITests(APITestCase):
    """Tests for the Counsellor Search API."""

    def setUp(self):
        # Specializations
        self.spec_anxiety = Specialization.objects.create(name="Anxiety")
        self.spec_depression = Specialization.objects.create(name="Depression")

        # Counsellor 1
        self.user1 = User.objects.create_user(
            email="c1@example.com",
            password="test1234",
            first_name="Alice",
            last_name="Smith",
            role="counsellor",
            is_active=True
        )
        self.profile1 = CounsellorProfile.objects.create(
            user=self.user1,
            fees_per_session=500,
            experience="5 years",
            license_number="LIC001"       # <-- IMPORTANT
        )
        self.profile1.specializations.add(self.spec_anxiety)

        # Counsellor 2
        self.user2 = User.objects.create_user(
            email="c2@example.com",
            password="test1234",
            first_name="Bob",
            last_name="Johnson",
            role="counsellor",
            is_active=True
        )
        self.profile2 = CounsellorProfile.objects.create(
            user=self.user2,
            fees_per_session=900,
            experience="10 years",
            license_number="LIC002"       # <-- IMPORTANT
        )
        self.profile2.specializations.add(self.spec_depression)

        self.url = reverse("search-counsellors")
