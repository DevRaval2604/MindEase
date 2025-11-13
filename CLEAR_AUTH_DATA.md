# How to Clear Logged-In Data for Testing

## Option 1: Browser Console (Recommended - Fastest)

Open your browser's Developer Console (F12) and run these commands:

### Clear All Auth Data:
```javascript
// Clear localStorage
localStorage.removeItem('auth:user');
localStorage.clear(); // Optional: clear all localStorage

// Clear sessionStorage
sessionStorage.clear();

// Clear cookies (for localhost)
document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// Clear cookies specifically for the app
document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

console.log("✅ Auth data cleared! Please refresh the page.");
```

### After running, refresh the page (F5)

---

## Option 2: Browser DevTools (Manual)

### Chrome/Edge:
1. Press `F12` to open DevTools
2. Go to **Application** tab
3. **Local Storage** → `http://localhost:5173` → Right-click → Clear
4. **Session Storage** → `http://localhost:5173` → Right-click → Clear
5. **Cookies** → `http://localhost:5173` → Delete `access_token` and `refresh_token`
6. Refresh the page

### Firefox:
1. Press `F12` to open DevTools
2. Go to **Storage** tab
3. Expand **Local Storage** → Clear all
4. Expand **Session Storage** → Clear all
5. Expand **Cookies** → Delete `access_token` and `refresh_token`
6. Refresh the page

---

## Option 3: Delete User from Database (If testing with same email/phone)

If you want to test signup again with the **same email or phone number**, you need to delete the user from the database.

### Using Django Admin:
1. Go to http://localhost:8000/admin
2. Login with admin credentials
3. Go to **Users** → Find your user → Delete

### Using Django Shell:
```bash
cd backend
python manage.py shell
```

Then run:
```python
from apps.accounts.models import User

# Find and delete user by email
user = User.objects.get(email='your-email@example.com')
user.delete()
print("User deleted successfully!")
```

### Using Database Directly:
```bash
cd backend
python manage.py shell
```

```python
from apps.accounts.models import User, EmailVerificationToken

# Delete user and related data
email = 'your-email@example.com'
User.objects.filter(email=email).delete()
EmailVerificationToken.objects.filter(user__email=email).delete()
print("User and tokens deleted!")
```

---

## Option 4: Complete Reset Script

Create a Python script to reset everything:

```python
# reset_user.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User, EmailVerificationToken, ClientProfile, CounsellorProfile

def reset_user(email):
    try:
        user = User.objects.get(email=email)
        # Delete related profiles
        if hasattr(user, 'client_profile'):
            user.client_profile.delete()
        if hasattr(user, 'counsellor_profile'):
            user.counsellor_profile.delete()
        # Delete email tokens
        EmailVerificationToken.objects.filter(user=user).delete()
        # Delete user
        user.delete()
        print(f"✅ User {email} and all related data deleted successfully!")
    except User.DoesNotExist:
        print(f"❌ User with email {email} not found.")

# Usage
reset_user('your-email@example.com')
```

Run it:
```bash
cd backend
python reset_user.py
```

---

## Quick Test After Clearing

1. Clear browser data (Option 1 or 2)
2. Refresh the page
3. You should be logged out
4. Try signing up again
5. If you get "email already exists" error, use Option 3 to delete the user from database

---

## Notes

- **localStorage** stores user data in the browser
- **Cookies** store JWT tokens (HttpOnly, so JavaScript can't access them directly, but we can delete them)
- **Database** stores the actual user account
- If you only clear browser data, the user account still exists in the database
- To test signup with the same email, you must delete the user from the database

