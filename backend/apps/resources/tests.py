from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status

from apps.resources.models import Resource
from apps.resources.serializers import ResourceSerializer


class ResourceModelTests(APITestCase):
    """Unit tests for the Resource model."""

    def test_resource_creation(self):
        resource = Resource.objects.create(
            title="Stress Management Article",
            description="Learn techniques to manage stress.",
            resource_type="article",
            url="https://example.com/stress-article"
        )
        self.assertEqual(str(resource), "Stress Management Article (article)")
        self.assertIsNotNone(resource.created_at)
        self.assertEqual(resource.resource_type, "article")


class ResourceSerializerTests(APITestCase):
    """Unit tests for the Resource serializer."""

    def test_valid_serializer(self):
        data = {
            "title": "Anxiety Video",
            "description": "Helpful video for anxiety.",
            "resource_type": "video",
            "url": "https://example.com/video",
        }
        serializer = ResourceSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data["resource_type"], "video")

    def test_invalid_missing_title(self):
        data = {
            "description": "Missing title",
            "resource_type": "article",
            "url": "https://example.com/article",
        }
        serializer = ResourceSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("title", serializer.errors)

    def test_invalid_type(self):
        data = {
            "title": "Invalid Type",
            "description": "",
            "resource_type": "unknown",
            "url": "https://example.com/x",
        }
        serializer = ResourceSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("resource_type", serializer.errors)


class ResourceAPITests(APITestCase):
    """API tests for Resource list endpoint with search & filter."""

    def setUp(self):
        self.url = reverse("resources-list")

        # Prepare sample resources
        Resource.objects.create(
            title="Stress Management Article",
            description="Learn techniques to reduce stress",
            resource_type="article",
            url="https://example.com/a1",
            created_at=timezone.now()
        )
        Resource.objects.create(
            title="Anxiety Relief Video",
            description="Watch this to calm your mind",
            resource_type="video",
            url="https://example.com/v1",
            created_at=timezone.now()
        )
        Resource.objects.create(
            title="Depression Guide PDF",
            description="Deep insights into depression",
            resource_type="pdf",
            url="https://example.com/p1",
            created_at=timezone.now()
        )

    def test_list_all_resources(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 3)

    def test_search_resources(self):
        response = self.client.get(self.url, {"q": "stress"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIn("Stress", response.data["results"][0]["title"])

    def test_filter_by_type_article(self):
        response = self.client.get(self.url, {"type": "article"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["resource_type"], "article")

    def test_filter_by_type_video(self):
        response = self.client.get(self.url, {"type": "video"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)

    def test_invalid_type_filter(self):
        response = self.client.get(self.url, {"type": "invalid"})
        # Should return ALL resources, because type filter is ignored
        self.assertEqual(len(response.data["results"]), 3)

    def test_empty_query_returns_all(self):
        response = self.client.get(self.url, {"q": ""})
        self.assertEqual(len(response.data["results"]), 3)

    def test_case_insensitive_search(self):
        response = self.client.get(self.url, {"q": "ANXIETY"})
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIn("Anxiety", response.data["results"][0]["title"])

    def test_pagination(self):
        # default page_size=9 → all 3 should come in one page
        response = self.client.get(self.url + "?page=1")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 3)

    def test_no_results(self):
        response = self.client.get(self.url, {"q": "abcdxyz"})
        self.assertEqual(len(response.data["results"]), 0)
        