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


    def test_list_all_counsellors(self):
        """Ensure default listing returns all counsellors."""
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 2)

    def test_search_by_name(self):
        """Search by first_name / last_name / email."""
        res = self.client.get(self.url, {"q": "Alice"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["results"][0]["full_name"], "Alice Smith")

    def test_search_by_email(self):
        res = self.client.get(self.url, {"q": "c2"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)

    def test_specialization_filter(self):
        """Filter counsellors by specialization name."""
        res = self.client.get(self.url, {"specialization": "Anxiety"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["full_name"], "Alice Smith")

    def test_multiple_specializations(self):
        res = self.client.get(self.url, {"specialization": "Anxiety,Depression"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 2)

    def test_min_fee_filter(self):
        res = self.client.get(self.url, {"min_fee": 800})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["full_name"], "Bob Johnson")

    def test_max_fee_filter(self):
        res = self.client.get(self.url, {"max_fee": 600})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["full_name"], "Alice Smith")

    def test_invalid_fee_filter(self):
        """Invalid fee should return zero results, not crash."""
        res = self.client.get(self.url, {"min_fee": "invalid"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 0)

    def test_order_by_fees_asc(self):
        res = self.client.get(self.url, {"ordering": "fees_asc"})
        results = res.data["results"]
        self.assertEqual(results[0]["fees_per_session"], "500.00")

    def test_order_by_fees_desc(self):
        res = self.client.get(self.url, {"ordering": "fees_desc"})
        results = res.data["results"]
        self.assertEqual(results[0]["fees_per_session"], "900.00")

    def test_order_by_name_desc(self):
        res = self.client.get(self.url, {"ordering": "name_desc"})
        results = res.data["results"]
        self.assertEqual(results[0]["full_name"], "Bob Johnson")