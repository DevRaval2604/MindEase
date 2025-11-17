# apps/accounts/management/commands/seed_verification_tokens.py
import os
import uuid
from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from django.contrib.auth import get_user_model
from apps.accounts.models import EmailVerificationToken


User = get_user_model()


class Command(BaseCommand):
    help = "Create N test users and EmailVerificationToken rows, write raw tokens to a file."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=1000, help="Number of tokens/users to create")
        parser.add_argument("--outfile", type=str, default="verify_tokens.txt", help="Output file path (one raw token per line)")
        parser.add_argument("--domain", type=str, default="perf.local", help="Email domain for created users")
        parser.add_argument("--user-prefix", type=str, default="verify", help="Prefix for test user emails")
        parser.add_argument("--ttl-hours", type=int, default=24*7, help="Token TTL in hours (default 7 days)")

    def handle(self, *args, **options):
        count = options["count"]
        outpath = Path(options["outfile"]).resolve()
        domain = options["domain"]
        prefix = options["user_prefix"]
        ttl = int(options["ttl_hours"])

        outpath.parent.mkdir(parents=True, exist_ok=True)

        created = 0
        with outpath.open("w", encoding="utf-8") as f_out:
            for i in range(count):
                # email unique
                email = f"{prefix}+{uuid.uuid4().hex[:12]}@{domain}"
                username = email.split("@")[0]
                with transaction.atomic():
                    # create user inactive (create_user should set is_active False)
                    user = User.objects.create_user(email=email, password=None)
                    # generate raw token
                    raw = EmailVerificationToken.generate_raw_token()
                    token = EmailVerificationToken(user=user)
                    token.set_raw_token(raw, ttl_hours=ttl)
                    token.used = False
                    token.save()
                    # write raw token (one per line) optionally include email for reference
                    f_out.write(f"{raw}\t{email}\n")
                    created += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created} tokens. Wrote to {outpath}"))
