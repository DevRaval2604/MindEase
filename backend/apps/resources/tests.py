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
