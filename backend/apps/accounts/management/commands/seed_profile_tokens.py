# apps/accounts/management/commands/seed_profile_tokens.py
from pathlib import Path
import uuid
import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model

from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import (
    ClientProfile,
    CounsellorProfile,
    Specialization,
    AvailabilitySlot,
)

User = get_user_model()


def _ensure_default_options():
    """
    If there are no Specialization / AvailabilitySlot rows, create a few
    sensible defaults so counsellor seeding won't fail.
    """
    if Specialization.objects.count() == 0:
        defaults = [
            "Anxiety", "Depression", "Stress Management", "Relationship Counseling",
            "Child & Adolescent", "Career Counseling", "Trauma & PTSD", "CBT"
        ]
        for name in defaults:
            Specialization.objects.create(name=name)

    if AvailabilitySlot.objects.count() == 0:
        slots = ["Mon - Morning", "Mon - Afternoon", "Tue - Morning", "Tue - Afternoon", "Wed - Morning", "Wed - Afternoon"]
        for s in slots:
            AvailabilitySlot.objects.create(name=s)


def _random_license():
    return f"LIC-{uuid.uuid4().hex[:10].upper()}"


class Command(BaseCommand):
    help = "Create N active users with profiles and write access tokens to a file. Writes lines: <access_token>\\t<email>"

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=500, help="Number of users to create")
        parser.add_argument("--outfile", type=str, default="profile_tokens.txt", help="Output file path")
        parser.add_argument("--domain", type=str, default="perf.local", help="Email domain for seeded users")
        parser.add_argument("--prefix", type=str, default="profile_", help="Email prefix to help cleanup")
        parser.add_argument("--counsellor-pct", type=float, default=0.0, help="Fraction (0..1) of seeded users to be counsellors")

    def handle(self, *args, **options):
        count = max(1, options["count"])
        outpath = Path(options["outfile"]).resolve()
        domain = options["domain"]
        prefix = options["prefix"]
        counsellor_pct = float(options["counsellor_pct"])
        outpath.parent.mkdir(parents=True, exist_ok=True)

        # Ensure option rows exist (so counsellor creation can reference them)
        _ensure_default_options()
        spec_ids = list(Specialization.objects.values_list("id", flat=True))
        avail_ids = list(AvailabilitySlot.objects.values_list("id", flat=True))

        created = 0
        with outpath.open("w", encoding="utf-8") as fh:
            for i in range(count):
                email = f"{prefix}{uuid.uuid4().hex[:12]}@{domain}"
                password = "Perf@12345"
                make_counsellor = random.random() < counsellor_pct

                with transaction.atomic():
                    # Create user (active & verified)
                    user, created_flag = User.objects.get_or_create(
                        email=email,
                        defaults={"is_active": True, "email_verified": True}
                    )
                    if created_flag:
                        user.set_password(password)
                        # set role explicitly
                        user.role = User.Roles.COUNSELLOR if make_counsellor else User.Roles.CLIENT
                        user.is_active = True
                        user.email_verified = True
                        user.save(update_fields=["password", "role", "is_active", "email_verified"])
                    else:
                        # if user existed, ensure role set correctly
                        user.role = User.Roles.COUNSELLOR if make_counsellor else User.Roles.CLIENT
                        user.save(update_fields=["role"])

                    # Create matching profile if missing
                    if make_counsellor:
                        # Ensure counsellor minimal fields are present
                        fees = Decimal(str(round(random.uniform(100, 500), 2)))
                        licence = _random_license()
                        counsellor, _ = CounsellorProfile.objects.get_or_create(
                            user=user,
                            defaults={
                                "license_number": licence,
                                "fees_per_session": fees,
                                "experience": "Seeded perf counsellor",
                            }
                        )
                        # attach some spec/avail if available
                        if spec_ids:
                            chosen = random.sample(spec_ids, min(3, len(spec_ids)))
                            counsellor.specializations.set(chosen)
                        if avail_ids:
                            chosen = random.sample(avail_ids, min(3, len(avail_ids)))
                            counsellor.availability.set(chosen)
                        counsellor.save()
                    else:
                        # create minimal client profile
                        ClientProfile.objects.get_or_create(
                            user=user,
                            defaults={"age_group": None, "agreed_terms": True}
                        )

                    # Create token and write access token + email
                    refresh = RefreshToken.for_user(user)
                    access_token = str(refresh.access_token)
                    fh.write(f"{access_token}\t{email}\n")
                    created += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created} users (counsellor_pct={counsellor_pct}) and wrote tokens to {outpath}"))
