# accounts/utils.py
from django.conf import settings
from django.urls import reverse
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from .models import EmailVerificationToken


def create_email_verification_token(user, ttl_hours: int = 24):
    """
    Create DB token and return raw token (send raw token in email link).
    """
    raw = EmailVerificationToken.generate_raw_token()
    token_obj = EmailVerificationToken(user=user)          
    token_obj.set_raw_token(raw, ttl_hours=ttl_hours)
    token_obj.save()
    return raw, token_obj


def send_verification_email(user, raw_token):
    """
    Sends a verification email using HTML + text templates.
    Gmail SMTP will be used from settings.py.
    """
    frontend = settings.FRONTEND_URL.rstrip("/")
    verify_url = f"{frontend}/verify-email?token={raw_token}"

    context = {
        "user": user,
        "verify_url": verify_url,
    }

    subject = "Verify your MindEase email"
    text_body = render_to_string("emails/verify_email.txt", context)
    html_body = render_to_string("emails/verify_email.html", context)

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )

    msg.attach_alternative(html_body, "text/html")

    # Send email (synchronously)
    msg.send(fail_silently=False)