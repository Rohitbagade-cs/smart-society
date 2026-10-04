"""URL routes for the society app (registered under /api/ by config.urls)."""

from rest_framework.routers import DefaultRouter

from apps.society.views import SocietyViewSet

router = DefaultRouter()
router.register("society", SocietyViewSet, basename="society")

urlpatterns = router.urls
