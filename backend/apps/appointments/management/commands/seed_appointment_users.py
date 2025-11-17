# apps/appointments/management/commands/seed_appointment_users.py
import uuid
import random
from pathlib import Path
from decimal import Decimal
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import CounsellorProfile

User = get_user_model()


def _random_license():
    return f"LIC-{uuid.uuid4().hex[:10].upper()}"


class Command(BaseCommand):
    help = "Seed client and counsellor users for appointment perf tests. Writes client access tokens and counsellor ids to files."

    def add_arguments(self, parser):
        parser.add_argument("--clients", type=int, default=200, help="Number of client users to create")
        parser.add_argument("--counsellors", type=int, default=50, help="Number of counsellor users to create")
        parser.add_argument("--out-tokens", type=str, default="appt_client_tokens.txt", help="Output file for client access tokens (one per line: token\\temail\\tuser_id)")
        parser.add_argument("--out-counsellors", type=str, default="appt_counsellors.txt", help="Output file for counsellor user ids (one per line)")
        parser.add_argument("--domain", type=str, default="perf.local", help="Email domain")
        parser.add_argument("--prefix", type=str, default="appt_", help="Email prefix for both client and counsellor (helps cleanup)")
        parser.add_argument("--min-fee", type=float, default=200.0, help="Min counsellor fee")
        parser.add_argument("--max-fee", type=float, default=1000.0, help="Max counsellor fee")

    def handle(self, *args, **options):
        clients = max(0, options["clients"])
        counsellors = max(0, options["counsellors"])
        out_tokens = Path(options["out_tokens"]).resolve()
        out_couns = Path(options["out_counsellors"]).resolve()
        domain = options["domain"]
        prefix = options["prefix"]
        min_fee = Decimal(str(options["min_fee"]))
        max_fee = Decimal(str(options["max_fee"]))

        out_tokens.parent.mkdir(parents=True, exist_ok=True)
        out_couns.parent.mkdir(parents=True, exist_ok=True)

        created_clients = []
        created_couns = []

        # create counsellors first
        for i in range(counsellors):
            email = f"{prefix}counsellor_{uuid.uuid4().hex[:10]}@{domain}"
            first = f"Coun{random.choice(['A','B','C'])}{uuid.uuid4().hex[:3]}"
            last = f"Prot{random.randint(10,999)}"
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
                    user.set_password("Perf@12345")
                    user.role = User.Roles.COUNSELLOR
                    user.is_active = True
                    user.email_verified = True
                    user.save(update_fields=["password", "role", "is_active", "email_verified"])

                # create minimal CounsellorProfile
                fee = Decimal(str(round(random.uniform(float(min_fee), float(max_fee)), 2)))
                licence = _random_license()
                cp, cp_created = CounsellorProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        "license_number": licence,
                        "fees_per_session": fee,
                        "experience": "Seeded for appointments perf",
                    }
                )
                # optionally attach nothing else (specializations not required here)
                created_couns.append(str(user.id))

        # create clients and write tokens
        with out_tokens.open("w", encoding="utf-8") as tf:
            for i in range(clients):
                email = f"{prefix}client_{uuid.uuid4().hex[:10]}@{domain}"
                first = f"Cli{random.choice(['A','B','C'])}{uuid.uuid4().hex[:3]}"
                last = f"User{random.randint(1,9999)}"
                with transaction.atomic():
                    user, created_flag = User.objects.get_or_create(
                        email=email,
                        defaults={
                            "first_name": first,
                            "last_name": last,
                            "is_active": True,
                            "email_verified": True,
                            "role": User.Roles.CLIENT,
                        }
                    )
                    if created_flag:
                        user.set_password("Perf@12345")
                        user.role = User.Roles.CLIENT
                        user.is_active = True
                        user.email_verified = True
                        user.save(update_fields=["password", "role", "is_active", "email_verified"])

                    # create access token
                    refresh = RefreshToken.for_user(user)
                    access = str(refresh.access_token)
                    tf.write(f"{access}\t{user.email}\t{user.id}\n")
                    created_clients.append(user.email)

        # write counsellor ids file
        with out_couns.open("w", encoding="utf-8") as cf:
            for cid in created_couns:
                cf.write(cid + "\n")

        self.stdout.write(self.style.SUCCESS(f"Created {len(created_couns)} counsellors and {len(created_clients)} clients."))
        self.stdout.write(self.style.SUCCESS(f"Wrote client tokens -> {out_tokens} and counsellor ids -> {out_couns}"))
