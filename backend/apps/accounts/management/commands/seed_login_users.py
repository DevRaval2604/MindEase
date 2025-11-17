# apps/accounts/management/commands/seed_login_users.py
import uuid
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

class Command(BaseCommand):
    help = "Create N active test users for login perf tests and write credentials to a file."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=1000, help="Number of users to create")
        parser.add_argument("--outfile", type=str, default="login_users.txt", help="Output file (email\\tpassword per line)")
        parser.add_argument("--domain", type=str, default="perf.local", help="Email domain to use for seed users")
        parser.add_argument("--prefix", type=str, default="login_", help="Email prefix before + to help cleanup")

    def handle(self, *args, **options):
        count = max(1, options["count"])
        outpath = Path(options["outfile"]).resolve()
        domain = options["domain"]
        prefix = options["prefix"]

        outpath.parent.mkdir(parents=True, exist_ok=True)

        created = 0
        with outpath.open("w", encoding="utf-8") as fh:
            for i in range(count):
                email = f"{prefix}{uuid.uuid4().hex[:10]}@{domain}"
                password = "Perf@12345"  # fixed password for all seeded users
                # create active & verified user
                with transaction.atomic():
                    user, created_flag = User.objects.get_or_create(
                        email=email,
                        defaults={"is_active": True, "email_verified": True}
                    )
                    if created_flag:
                        # set unusable then set password to ensure correct hash+last_password_change behavior
                        user.set_password(password)
                        user.is_active = True
                        user.email_verified = True
                        user.save(update_fields=["password", "is_active", "email_verified"])
                fh.write(f"{email}\t{password}\n")
                created += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created} users and wrote credentials to {outpath}"))
