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
<<<<<<< HEAD:backend/apps/accounts/utils.py
    from django.utils import timezone
    from datetime import timedelta
    
    frontend = settings.FRONTEND_URL.rstrip("/")
    verify_url = f"{frontend}/verify-email?token={raw_token}"

    # Get user's full name
    full_name = user.get_full_name() or user.get_short_name() or user.email.split('@')[0]
    
    # Calculate expiry info (token expires in 24 hours)
    expiry_time = timezone.now() + timedelta(hours=24)
    expiry_info = f"This link will expire on {expiry_time.strftime('%B %d, %Y at %I:%M %p')}."
    
    # Support email
    support_email = getattr(settings, 'SUPPORT_EMAIL', settings.DEFAULT_FROM_EMAIL)

    context = {
        "user": user,
        "full_name": full_name,
        "verify_url": verify_url,
        "expiry_info": expiry_info,
        "support_email": support_email,
        "now": timezone.now(),
    }

    subject = "Verify your MindEase email"
    try:
        text_body = render_to_string("emails/verify_email.txt", context)
        html_body = render_to_string("emails/verify_email.html", context)
    except Exception as e:
        # If template rendering fails, log and use a simple fallback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to render email templates: {e}")
        # Fallback to simple email
        text_body = f"Hi {full_name},\n\nPlease verify your email by clicking this link:\n{verify_url}\n\nThis link expires in 24 hours.\n\nThanks,\nThe MindEase Team"
        html_body = f"<html><body><p>Hi {full_name},</p><p>Please verify your email by clicking this link:</p><p><a href='{verify_url}'>Verify Email</a></p><p>This link expires in 24 hours.</p><p>Thanks,<br>The MindEase Team</p></body></html>"
=======
    frontend = settings.FRONTEND_URL.rstrip("/")
    verify_url = f"{frontend}/verify-email?token={raw_token}"

    context = {
        "user": user,
        "verify_url": verify_url,
    }

    subject = "Verify your MindEase email"
    text_body = render_to_string("emails/verify_email.txt", context)
    html_body = render_to_string("emails/verify_email.html", context)
>>>>>>> 5854e658564d1d000f65d4d4959a8a542dd062b6:backend_backup/apps/accounts/utils.py

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )

    msg.attach_alternative(html_body, "text/html")

<<<<<<< HEAD:backend/apps/accounts/utils.py
    # Send email (synchronously) - wrap in try/except to handle errors gracefully
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Attempting to send verification email to {user.email} from {settings.DEFAULT_FROM_EMAIL}")
        logger.info(f"Email subject: {subject}")
        logger.info(f"Verify URL: {verify_url}")
        result = msg.send(fail_silently=False)
        logger.info(f"Email send result: {result} (1 means sent successfully)")
        if result == 0:
            raise Exception("Email send returned 0, indicating failure")
    except Exception as e:
        logger.error(f"Failed to send verification email to {user.email}: {e}", exc_info=True)
        # Print to console as well for immediate visibility
        print(f"ERROR: Failed to send email to {user.email}: {e}")
        raise  # Re-raise so the view can handle it
=======
    # Send email (synchronously)
    msg.send(fail_silently=False)
>>>>>>> 5854e658564d1d000f65d4d4959a8a542dd062b6:backend_backup/apps/accounts/utils.py
