# apps/accounts/management/commands/seed_resend_emails.py
import uuid
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from django.conf import settings

User = get_user_model()


class Command(BaseCommand):
    help = "Seed users for resend-verification perf test and write emails to a file."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=500, help="Total users to create (unverified + verified).")
        parser.add_argument("--verified-pct", type=float, default=0.2, help="Fraction (0..1) of created users that are already verified.")
        parser.add_argument("--outfile", type=str, default="resend_emails.txt", help="Output file path (one email per line).")
        parser.add_argument("--non-existing-pct", type=float, default=0.1, help="Fraction (0..1) of lines that will be random non-existing emails.")
        parser.add_argument("--domain", type=str, default="perf.local", help="Email domain for created users.")

    def handle(self, *args, **options):
        count = max(1, options["count"])
        verified_pct = float(options["verified_pct"])
        non_existing_pct = float(options["non_existing_pct"])
        domain = options["domain"]
        outpath = Path(options["outfile"]).resolve()

        # Ensure directory
        outpath.parent.mkdir(parents=True, exist_ok=True)

        verified_count = int(count * verified_pct)
        unverified_count = count - verified_count

        created_emails = []

        self.stdout.write(f"Seeding {count} users: {unverified_count} unverified, {verified_count} verified.")
        for i in range(verified_count):
            email = f"resend_verified+{uuid.uuid4().hex[:10]}@{domain}"
            with transaction.atomic():
                user, created = User.objects.get_or_create(email=email, defaults={"is_active": True, "email_verified": True})
                if created:
                    user.set_unusable_password()
                    user.save(update_fields=["password", "is_active", "email_verified"])
            created_emails.append(email)

        for i in range(unverified_count):
            email = f"resend_unverified+{uuid.uuid4().hex[:10]}@{domain}"
            with transaction.atomic():
                user, created = User.objects.get_or_create(email=email, defaults={"is_active": False, "email_verified": False})
                if created:
                    user.set_unusable_password()
                    user.save(update_fields=["password", "is_active", "email_verified"])
            created_emails.append(email)

        # Now mix in some non-existing emails
        final_list = []
        import random
        for e in created_emails:
            final_list.append(e)
        non_existing_count = int(len(final_list) * non_existing_pct)
        for i in range(non_existing_count):
            final_list.append(f"nonexist+{uuid.uuid4().hex[:10]}@{domain}")

        # Shuffle lines so the test sees a mix
        random.shuffle(final_list)

        # Write the email list to file
        with outpath.open("w", encoding="utf-8") as fh:
            for e in final_list:
                fh.write(e + "\n")

        self.stdout.write(self.style.SUCCESS(f"Wrote {len(final_list)} emails to {outpath}"))
