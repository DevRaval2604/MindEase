
from pathlib import Path
from datetime import timedelta
import os


BASE_DIR = Path(__file__).resolve().parent.parent



# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-%35x3m_8enp3+enf%l3w17uweq7m90i4_11g6wmwu5s3x*)j&p'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True


# allow only your React dev server
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# allow cookies (important since you use HttpOnly cookies for tokens)
CORS_ALLOW_CREDENTIALS = True

# optionally allow extra headers the client might send
CORS_ALLOW_HEADERS = [
    "content-type",
    "accept",
    "authorization",
    "x-csrftoken",
]



# ALLOWED_HOSTS = ['*']


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Apps Configurations 
    'apps.accounts.apps.AccountsConfig',
    'apps.search.apps.SearchConfig',
    'apps.resources.apps.ResourcesConfig',

    # External Library Configurations
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    "drf_spectacular",
    'corsheaders',
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

AUTH_USER_MODEL = "apps_accounts.User"  # label_name.ModelName


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'



SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),   # adjust as needed
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,        # rotate refresh tokens on use
    "BLACKLIST_AFTER_ROTATION": False,     # blacklist old refresh tokens on rotation
    "ALGORITHM": "HS256",
}


# Cookie behavior for tokens
JWT_COOKIE_SECURE = False  # set to True in production (requires HTTPS)
JWT_COOKIE_SAMESITE = "Lax"  # "Lax" sensible default; use "Strict" if no cross-site needs
ACCESS_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"



# DRF config 
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        # custom cookie-jwt auth class recommended (reads access token from cookie)
        "apps.accounts.authentication.CookieJWTAuthentication",
        # optionally keep header-based JWT
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    # Use ScopedRateThrottle so views can define throttle_scope
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    # Set per-scope rates 
    "DEFAULT_THROTTLE_RATES": {
        "signup": "5/min",   
        "resend_verification": "10/day",
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}



# CACHES must be configured because throttling uses cache
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache", 
    }
}


# FRONTEND_URL used by send_verification_email
FRONTEND_URL = "http://localhost:5173/"  


# Use Gmail’s SMTP server
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST        = 'smtp.gmail.com'
EMAIL_PORT        = 587
EMAIL_USE_TLS     = True

DEFAULT_FROM_EMAIL = 'paras0mani6@gmail.com'

EMAIL_HOST_USER    = 'paras0mani6@gmail.com'
EMAIL_HOST_PASSWORD= 'toihpuhoxmmixpho'  









