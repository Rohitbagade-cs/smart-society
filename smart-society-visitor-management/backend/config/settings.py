"""
Django settings for Smart Society Visitor Management backend.

Configuration is read from environment variables (see .env.example).
The database layer is Microsoft SQL Server (via mssql-django / ODBC),
served to the Angular client over a JWT-secured Django REST Framework API.
"""

import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _env(name, default=""):
    return os.environ.get(name, default)


def _env_list(name, default=""):
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


SECRET_KEY = _env("SECRET_KEY", "dev-only-insecure-secret-key-change-me")
DEBUG = _env("DEBUG", "1") in ("1", "true", "True", "yes")

ALLOWED_HOSTS = _env_list("ALLOWED_HOSTS", "*")

# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "apps.accounts",
    "apps.visitors",
    "apps.society",
    "apps.ai",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # must sit above CommonMiddleware
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Database — Microsoft SQL Server (mssql-django via ODBC)
#
# DB_HOST: server name as shown in SSMS, e.g. localhost\SQLEXPRESS
# Auth: leave DB_USER/DB_PASSWORD empty to use Windows Authentication,
#       or set both for a SQL Server login.
# Requires "ODBC Driver 18 for SQL Server" (installed with SSMS/SQL Server;
# otherwise download it from Microsoft).
# ---------------------------------------------------------------------------
_db_options = {
    "driver": _env("DB_ODBC_DRIVER", "ODBC Driver 18 for SQL Server"),
    # ODBC Driver 18 encrypts by default; a local dev instance has no trusted
    # cert, so trust the server certificate.
    "extra_params": "TrustServerCertificate=yes",
}
if not _env("DB_USER"):
    _db_options["trusted_connection"] = "yes"  # Windows Authentication

DATABASES = {
    "default": {
        "ENGINE": "mssql",
        "NAME": _env("DB_NAME", "smart_society_db"),
        "USER": _env("DB_USER", ""),
        "PASSWORD": _env("DB_PASSWORD", ""),
        "HOST": _env("DB_HOST", "localhost\\SQLEXPRESS"),
        "PORT": _env("DB_PORT", ""),
        "OPTIONS": _db_options,
    }
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Internationalization / timezone
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": (
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
}

# ---------------------------------------------------------------------------
# Simple JWT
# ---------------------------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}

# ---------------------------------------------------------------------------
# CORS — allow the Angular dev server
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = _env_list("CORS_ALLOWED_ORIGINS", "http://localhost:4200")
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# HTTPS-ready production toggles (set DEBUG=0 and serve behind TLS)
# ---------------------------------------------------------------------------
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
