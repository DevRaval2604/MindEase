# apps/search/management/commands/seed_search_counsellors.py
import random
import uuid
from pathlib import Path
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model

from apps.accounts.models import (
    CounsellorProfile,
    Specialization,
    AvailabilitySlot,
)

User = get_user_model()


DEFAULT_SPECIALIZATIONS = [
    "Anxiety", "Depression", "Stress Management", "Relationship Counseling",
    "Child & Adolescent", "Career Counseling", "Addiction Recovery", "Trauma & PTSD", "CBT"
]

DEFAULT_AVAILABILITY = [
    "Mon - Morning", "Mon - Afternoon", "Tue - Morning", "Tue - Afternoon",
    "Wed - Morning", "Wed - Afternoon", "Thu - Morning", "Thu - Afternoon", "Fri - Morning"
]


def _ensure_options():
    """Create default specializations and availability slots if none exist."""
    if Specialization.objects.count() == 0:
        for name in DEFAULT_SPECIALIZATIONS:
            Specialization.objects.create(name=name)
    if AvailabilitySlot.objects.count() == 0:
        for name in DEFAULT_AVAILABILITY:
            AvailabilitySlot.objects.create(name=name)


def _random_license():
    return f"LIC-{uuid.uuid4().hex[:10].upper()}"


class Command(BaseCommand):
    help = "Seed N counsellor users + CounsellorProfile rows for search performance testing."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=500, help="Number of counsellors to create")
        parser.add_argument("--outfile", type=str, default="", help="Optional file to write created emails (one per line)")
        parser.add_argument("--domain", type=str, default="perf.local", help="Email domain to use for generated users")
        parser.add_argument("--prefix", type=str, default="search_", help="Prefix for seeded user emails (helps cleanup)")
        parser.add_argument("--min-fee", type=float, default=200.0, help="Minimum fees_per_session to randomize from")
        parser.add_argument("--max-fee", type=float, default=1500.0, help="Maximum fees_per_session to randomize to")
        parser.add_argument("--spec-pct", type=float, default=0.8, help="Fraction of counsellors that get 1-3 specializations")

    def handle(self, *args, **options):
        count = max(1, options["count"])
        outpath = Path(options["outfile"]).resolve() if options["outfile"] else None
        domain = options["domain"]
        prefix = options["prefix"]
        min_fee = Decimal(str(options["min_fee"]))
        max_fee = Decimal(str(options["max_fee"]))
        spec_pct = float(options["spec_pct"])

        # Ensure option tables exist
        _ensure_options()
        spec_ids = list(Specialization.objects.values_list("id", flat=True))
        avail_ids = list(AvailabilitySlot.objects.values_list("id", flat=True))
        spec_names = list(Specialization.objects.values_list("name", flat=True))

        created_emails = []

        for i in range(count):
            email = f"{prefix}{uuid.uuid4().hex[:10]}@{domain}"
            password = "Perf@12345"
            first = f"Test{random.choice(['A','B','C','D','E'])}{uuid.uuid4().hex[:4]}"
            last = f"User{random.randint(1,9999)}"
            license_number = _random_license()
            fees = Decimal(str(round(random.uniform(float(min_fee), float(max_fee)), 2)))

            with transaction.atomic():
                user, created_flag = User.objects.get_or_create(
                    email=email,
                    defaults={
                        "first_name": first,
                        "last_name": last,
                        "is_active": True,
                        "email_verified": True,
                        "role": User.Roles.COUNSELLOR,
                    }
                )
                if created_flag:
                    user.set_password(password)
                    user.role = User.Roles.COUNSELLOR
                    user.is_active = True
                    user.email_verified = True
                    user.save(update_fields=["password", "role", "is_active", "email_verified"])
                else:
                    user.role = User.Roles.COUNSELLOR
                    user.save(update_fields=["role"])

                # Create CounsellorProfile if missing
                cp, cp_created = CounsellorProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        "license_number": license_number,
                        "fees_per_session": fees,
                        "experience": "Seeded counsellor for search perf testing"
                    }
                )

                # Attach some specializations/availability
                if random.random() < spec_pct and spec_ids:
                    chosen = random.sample(spec_ids, min(3, len(spec_ids)))
                    cp.specializations.set(chosen)
                else:
                    # ensure at least one specialization so searches can hit
                    if spec_ids:
                        cp.specializations.set([random.choice(spec_ids)])

                if avail_ids:
                    chosen_av = random.sample(avail_ids, min(4, len(avail_ids)))
                    cp.availability.set(chosen_av)

                cp.save()

                created_emails.append(email)

        # write emails to outfile if requested
        if outpath:
            outpath.parent.mkdir(parents=True, exist_ok=True)
            with outpath.open("w", encoding="utf-8") as fh:
                for e in created_emails:
                    fh.write(e + "\n")

        self.stdout.write(self.style.SUCCESS(f"Created {len(created_emails)} counsellors. Specializations: {', '.join(spec_names[:5])}"))
        if outpath:
            self.stdout.write(self.style.SUCCESS(f"Wrote emails to {outpath}"))
