"""
Root URL configuration for the Smart Society Visitor Management backend.

All API endpoints live under /api/. Auth endpoints:
  POST /api/auth/login/          -> {access, refresh, user}
  POST /api/auth/token/refresh/  -> {access}
  POST /api/auth/register/       -> admin-only user creation
  GET  /api/auth/me/             -> current user profile
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.visitors.urls")),
    path("api/", include("apps.society.urls")),
    path("api/", include("apps.ai.urls")),
]
