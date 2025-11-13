# Design Patterns Analysis - MindEase Codebase

This document explains how Repository Pattern, Service Layer Pattern, and Singleton Pattern are implemented in the MindEase codebase.

---

## 1. Repository Pattern

### Overview
The Repository Pattern provides an abstraction layer between the business logic and data access layer. It encapsulates the logic needed to access data sources and provides a more object-oriented view of the persistence layer.

### Implementation in MindEase

#### 1.1 UserManager as Repository

**Location:** `backend/apps/accounts/models.py`

**Code Snippet:**
```python
class UserManager(BaseUserManager):
    def create_user(self, email: str, password: Optional[str] = None, **extra_fields):
        """
        Create and save a regular user.
        New users default to is_active=False so they cannot log in until email verification.
        """
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", False)  # IMPORTANT: block login until verification
        user = self.model(email=email, **extra_fields)

        if password:
            user.set_password(password)  # this will save and set last_password_change
        else:
            user.set_unusable_password()

        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)  # superusers active immediately

        if not password:
            raise ValueError("Superusers must have a password.")
        
        return self.create_user(email, password, **extra_fields)
```

**How it applies the Repository Pattern:**
- **Abstraction of Data Access**: The `UserManager` class abstracts away the direct database operations. Instead of writing raw SQL queries, the application uses methods like `create_user()` and `create_superuser()`.
- **Centralized Business Logic**: User creation logic (email normalization, password hashing, default values) is centralized in the manager, not scattered across views or services.
- **Consistent Interface**: All user creation operations go through the same interface (`User.objects.create_user()`), ensuring consistency.
- **Separation of Concerns**: Views and services don't need to know the details of how users are stored in the database; they just call the repository methods.

**Usage Example:**
```python
# In serializers or views, instead of direct database access:
user = User.objects.create_user(email="user@example.com", password="password123")
```

#### 1.2 Django ORM Managers as Repository Pattern

**Location:** `backend/apps/search/views.py`

**Code Snippet:**
```python
def get_queryset(self):
    qs = (
        CounsellorProfile.objects
        .select_related("user")
        .prefetch_related("specializations", "availability")
        .filter(user__is_active=True)
    )
```

**How it applies the Repository Pattern:**
- **Query Abstraction**: The `.objects` manager provides a repository-like interface for querying `CounsellorProfile` entities.
- **Complex Query Encapsulation**: Methods like `select_related()` and `prefetch_related()` encapsulate optimization logic (reducing database queries) without exposing SQL details.
- **Chainable Interface**: The fluent interface allows building complex queries in a readable way, while the actual SQL generation is hidden.
- **Data Source Independence**: If the database changes, only the ORM configuration needs to change, not the view code.

**Benefits:**
- Views don't need to know SQL syntax
- Database-specific optimizations are handled by the ORM
- Easy to test by mocking the queryset
- Consistent query patterns across the application

---

## 2. Service Layer Pattern

### Overview
The Service Layer Pattern encapsulates business logic that doesn't naturally fit within a single model or view. It provides a clean separation between the presentation layer (views) and the data access layer (models/repositories).

### Implementation in MindEase

#### 2.1 Email Verification Service

**Location:** `backend/apps/accounts/utils.py`

**Code Snippet 1 - Token Creation Service:**
```python
def create_email_verification_token(user, ttl_hours: int = 24):
    """
    Create DB token and return raw token (send raw token in email link).
    """
    raw = EmailVerificationToken.generate_raw_token()
    token_obj = EmailVerificationToken(user=user)          
    token_obj.set_raw_token(raw, ttl_hours=ttl_hours)
    token_obj.save()
    return raw, token_obj
```

**How it applies the Service Layer Pattern:**
- **Business Logic Encapsulation**: This function encapsulates the business logic of creating verification tokens, including token generation, expiration setting, and database persistence.
- **Reusability**: The function can be called from multiple views (signup, resend verification) without duplicating code.
- **Single Responsibility**: The function has one clear purpose: create a verification token for a user.
- **Abstraction**: Views don't need to know how tokens are generated or stored; they just call the service function.

**Code Snippet 2 - Email Sending Service:**
```python
def send_verification_email(user, raw_token):
    """
    Sends a verification email using HTML + text templates.
    Gmail SMTP will be used from settings.py.
    """
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

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )

    msg.attach_alternative(html_body, "text/html")

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
```

**How it applies the Service Layer Pattern:**
- **Complex Business Logic**: This function handles multiple concerns: URL generation, template rendering, email composition, and error handling.
- **External Service Integration**: It abstracts away the details of SMTP email sending, making it easy to switch email providers without changing view code.
- **Error Handling**: Centralized error handling and logging for email operations.
- **Template Management**: Handles both HTML and text email templates with fallback mechanisms.
- **Configuration Abstraction**: Uses Django settings for configuration, making it easy to change email settings without modifying code.

**Usage in Views:**
```python
# In views.py (SignupView):
raw_token, token_obj = create_email_verification_token(user, ttl_hours=24)
send_verification_email(user, raw_token)
```

**Benefits:**
- Views remain thin and focused on HTTP request/response handling
- Business logic is testable independently of views
- Easy to modify email sending logic without touching multiple views
- Consistent email formatting across the application

---

## 3. Singleton Pattern

### Overview
The Singleton Pattern ensures that a class has only one instance and provides a global point of access to that instance. This is useful for managing shared resources, configuration, or state.

### Implementation in MindEase

#### 3.1 Razorpay Client Singleton

**Location:** `backend/apps/appointments/views.py`

**Code Snippet:**
```python
# Initialize Razorpay client
# You'll need to add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to settings.py
try:
    razorpay_client = razorpay.Client(
        auth=(getattr(settings, 'RAZORPAY_KEY_ID', ''), getattr(settings, 'RAZORPAY_KEY_SECRET', ''))
    )
except:
    razorpay_client = None
```

**How it applies the Singleton Pattern:**
- **Single Instance**: The `razorpay_client` is created once at module import time, ensuring only one instance exists throughout the application's lifetime.
- **Global Access**: Any view or service in the `appointments` app can import and use the same `razorpay_client` instance.
- **Resource Efficiency**: Creating multiple Razorpay client instances would be wasteful; the singleton ensures efficient resource usage.
- **Configuration Centralization**: The client is configured once with settings, and all payment operations use the same configured client.

**Usage Example:**
```python
# In CreateRazorpayOrderView:
if not razorpay_client:
    return Response({'detail': 'Razorpay is not configured.'}, ...)

razorpay_order = razorpay_client.order.create(data=order_data)
```

**Benefits:**
- Prevents multiple client initializations
- Ensures consistent configuration across all payment operations
- Reduces memory footprint
- Simplifies testing (can mock the single instance)

#### 3.2 React AuthContext Singleton

**Location:** `frontend/src/context/AuthContext.jsx`

**Code Snippet 1 - Context Creation:**
```python
const AuthContext = createContext({
  isAuthenticated: false,
  userType: null,
  login: () => { },
  logout: () => { },
});
```

**Code Snippet 2 - Provider Component:**
```python
export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); // {id,email,first_name,last_name,role}
```

**How it applies the Singleton Pattern:**
- **Single Source of Truth**: The `AuthContext` provides a single, centralized source for authentication state across the entire React application.
- **Global State Management**: Only one `AuthProvider` instance wraps the application, ensuring all components access the same authentication state.
- **Consistent State**: All components using `useAuth()` hook get the same authentication state, preventing inconsistencies.
- **Lifetime Management**: The auth state persists for the application's lifetime, similar to a singleton's behavior.

**Usage Example:**
```javascript
// In any component:
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { isAuthenticated, user, login, logout } = useAuth();
  // All components get the same auth state
}
```

**Benefits:**
- Prevents authentication state duplication
- Ensures all components see the same user state
- Simplifies authentication logic (no prop drilling)
- Easy to add authentication checks anywhere in the app

#### 3.3 Django Settings as Singleton

**Location:** `backend/config/settings.py`

**Code Snippet:**
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

**How it applies the Singleton Pattern:**
- **Single Configuration Instance**: Django's settings module is loaded once when the application starts, creating a single configuration instance.
- **Global Access**: Any part of the application can import `from django.conf import settings` and access the same configuration.
- **Immutable During Runtime**: Settings are typically read-only during runtime, ensuring consistency.
- **Centralized Configuration**: All application configuration (database, email, API keys) is in one place.

**Usage Example:**
```python
# Anywhere in the application:
from django.conf import settings

database_name = settings.DATABASES['default']['NAME']
email_host = settings.EMAIL_HOST
```

**Benefits:**
- Single source of configuration
- Easy to manage environment-specific settings
- Prevents configuration duplication
- Consistent configuration access across the application

---

## Pattern Comparison Summary

| Pattern | Purpose | Implementation | Benefits |
|---------|---------|----------------|----------|
| **Repository** | Abstraction of data access | Django ORM Managers, Custom Managers | Decouples business logic from database, easier testing, consistent data access |
| **Service Layer** | Encapsulation of business logic | Utility functions in `utils.py` | Reusable business logic, separation of concerns, easier maintenance |
| **Singleton** | Single instance of a resource | Module-level variables, React Context, Django Settings | Resource efficiency, consistent state, centralized configuration |

---

## Best Practices Observed

1. **Repository Pattern**: Django's ORM naturally implements repository pattern, making data access consistent and testable.
2. **Service Layer**: Business logic is separated from views, making the codebase more maintainable and testable.
3. **Singleton**: Used appropriately for shared resources (payment client, auth state, configuration) without overuse.

---

## Recommendations

1. **Consider creating explicit Service Classes**: While utility functions work, explicit service classes (e.g., `EmailService`, `PaymentService`) would make the service layer more explicit and easier to extend.

2. **Repository Pattern Enhancement**: Consider creating custom repository classes for complex queries to further abstract data access logic.

3. **Singleton Pattern**: The current implementations are appropriate. Be cautious not to overuse singletons, as they can make testing more difficult if not properly managed.

