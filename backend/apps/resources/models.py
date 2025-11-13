from django.db import models
from django.utils import timezone

class Resource(models.Model):
    class Types(models.TextChoices):
        ARTICLE = "article", "Article"
        VIDEO = "video", "Video"
        PDF = "pdf", "PDF"

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    resource_type = models.CharField(max_length=20, choices=Types.choices, db_index=True)
    url = models.URLField(help_text="External link to article/video/pdf")
    thumbnail_url = models.URLField(blank=True, null=True)
    external = models.BooleanField(default=True)
    published_at = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Resource"
        verbose_name_plural = "Resources"

    def __str__(self):
        return f"{self.title} ({self.resource_type})"
