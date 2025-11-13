"""
Script to delete a user from the database.
Usage: python delete_user.py <email>
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User, EmailVerificationToken, ClientProfile, CounsellorProfile

def delete_user(email):
    """Delete a user and all related data."""
    try:
        user = User.objects.get(email=email)
        
        print(f"Found user: {user.email} (ID: {user.id})")
        print(f"Role: {user.role}")
        
        # Delete related profiles
        if hasattr(user, 'client_profile'):
            user.client_profile.delete()
            print("✅ Deleted client profile")
        
        if hasattr(user, 'counsellor_profile'):
            user.counsellor_profile.delete()
            print("✅ Deleted counsellor profile")
        
        # Delete email verification tokens
        tokens_count = EmailVerificationToken.objects.filter(user=user).delete()[0]
        if tokens_count > 0:
            print(f"✅ Deleted {tokens_count} email verification token(s)")
        
        # Delete user
        user_email = user.email
        user.delete()
        print(f"✅ User {user_email} deleted successfully!")
        return True
        
    except User.DoesNotExist:
        print(f"❌ User with email '{email}' not found.")
        return False
    except Exception as e:
        print(f"❌ Error deleting user: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python delete_user.py <email>")
        print("Example: python delete_user.py user@example.com")
        sys.exit(1)
    
    email = sys.argv[1]
    print(f"🗑️  Deleting user: {email}")
    print("-" * 50)
    success = delete_user(email)
    print("-" * 50)
    
    if success:
        print("✅ User deletion completed!")
    else:
        print("❌ User deletion failed!")
        sys.exit(1)

