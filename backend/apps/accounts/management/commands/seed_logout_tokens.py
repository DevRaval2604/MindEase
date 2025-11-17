# apps/accounts/management/commands/seed_logout_tokens.py
from pathlib import Path
import uuid
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model

from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class Command(BaseCommand):
    help = "Create N active users and write their raw refresh tokens to a file (one per line: <refresh_token>\\t<email>)."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=500, help="Number of users to create")
        parser.add_argument("--outfile", type=str, default="logout_tokens.txt", help="Output file path")
        parser.add_argument("--domain", type=str, default="perf.local", help="Email domain for seeded users")
        parser.add_argument("--prefix", type=str, default="logout_", help="Email prefix used (helps cleanup)")
        parser.add_argument("--set-role", type=str, choices=["client","counsellor","mixed"], default="client",
                            help="Role to set for seeded users. 'mixed' will randomly assign roles.")

    def handle(self, *args, **options):
        count = max(1, options["count"])
        outpath = Path(options["outfile"]).resolve()
        domain = options["domain"]
        prefix = options["prefix"]
        role_opt = options["set_role"]

        outpath.parent.mkdir(parents=True, exist_ok=True)

        created = 0
        with outpath.open("w", encoding="utf-8") as fh:
            for i in range(count):
                email = f"{prefix}{uuid.uuid4().hex[:12]}@{domain}"
                password = "Perf@12345"

                with transaction.atomic():
                    user, created_flag = User.objects.get_or_create(
                        email=email,
                        defaults={"is_active": True, "email_verified": True}
                    )
                    if created_flag:
                        user.set_password(password)
                        # decide role
                        if role_opt == "mixed":
                            import random
                            r = random.random()
                            user.role = user.Roles.COUNSELLOR if r < 0.2 else user.Roles.CLIENT
                        elif role_opt == "counsellor":
                            user.role = user.Roles.COUNSELLOR
                        else:
                            user.role = user.Roles.CLIENT
                        user.is_active = True
                        user.email_verified = True
                        user.save(update_fields=["password", "role", "is_active", "email_verified"])
                    else:
                        # ensure role set per option
                        if role_opt == "counsellor":
                            user.role = user.Roles.COUNSELLOR
                            user.save(update_fields=["role"])

                    # create a refresh token for the user and write it out
                    refresh = RefreshToken.for_user(user)
                    raw_refresh = str(refresh)
                    fh.write(f"{raw_refresh}\t{email}\n")
                    created += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created} users and wrote tokens to {outpath}"))
