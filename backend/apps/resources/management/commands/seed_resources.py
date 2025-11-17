# apps/resources/management/commands/seed_resources.py
import random
import uuid
from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.resources.models import Resource

SAMPLE_TITLES = [
    "Managing stress in daily life",
    "Coping with anxiety: practical steps",
    "Mindfulness for beginners",
    "How to improve sleep quality",
    "Dealing with relationship issues",
    "Workplace stress and burnout",
    "CBT techniques explained",
    "Self-care strategies",
    "Parenting during stressful times",
    "Recovery from trauma: an overview",
]

SAMPLE_DESCRIPTIONS = [
    "Short practical guide with exercises.",
    "Evidence-based approaches and tips.",
    "Video lecture with supporting resources.",
    "Downloadable PDF with worksheets.",
    "Expert interview and case studies.",
]

SAMPLE_URLS = [
    "https://example.com/article/",
    "https://example.org/video/",
    "https://cdn.example.com/files/",
]

class Command(BaseCommand):
    help = "Seed Resource rows for perf testing. Safe to re-run (creates new rows each run)."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=500, help="Number of resources to create")
        parser.add_argument("--outfile", type=str, default="", help="Optional file to write created IDs")
        parser.add_argument("--domain", type=str, default="perf.local", help="Domain used for generated URLs")

    def handle(self, *args, **options):
        count = max(1, options["count"])
        outpath = Path(options["outfile"]).resolve() if options["outfile"] else None
        domain = options["domain"]

        created = []
        for i in range(count):
            title = f"{random.choice(SAMPLE_TITLES)} — {uuid.uuid4().hex[:6]}"
            description = random.choice(SAMPLE_DESCRIPTIONS)
            rtype = random.choice([Resource.Types.ARTICLE, Resource.Types.VIDEO, Resource.Types.PDF])
            base = random.choice(SAMPLE_URLS)
            url = f"{base}{uuid.uuid4().hex}.html"
            thumb = f"https://{domain}/thumbs/{uuid.uuid4().hex}.jpg"

            with transaction.atomic():
                res = Resource.objects.create(
                    title=title,
                    description=description,
                    resource_type=rtype,
                    url=url,
                    thumbnail_url=thumb,
                    external=True
                )
                created.append(res.id)

        if outpath:
            outpath.parent.mkdir(parents=True, exist_ok=True)
            with outpath.open("w", encoding="utf-8") as fh:
                for rid in created:
                    fh.write(str(rid) + "\n")

        self.stdout.write(self.style.SUCCESS(f"Created {len(created)} Resource rows."))
        if outpath:
            self.stdout.write(self.style.SUCCESS(f"Wrote IDs to {outpath}"))
