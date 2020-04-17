from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions
from rest_framework_simplejwt import views as jwt_views

from fms_core.router import router

schema_view = get_schema_view(
    openapi.Info(
        title="FreezeMan API",
        default_version="v1",
        description="API documentation for the FreezeMan API",
        contact=openapi.Contact(email="info@computationalgenomics.ca"),
        license=openapi.License(name="LGPL-3.0-only"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

# noinspection PyUnresolvedReferences
urlpatterns = [
    path('', include(router.urls)),
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-redoc'),
    path('token/', jwt_views.TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', jwt_views.TokenRefreshView.as_view(), name='token_refresh'),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
