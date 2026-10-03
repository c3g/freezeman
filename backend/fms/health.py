from django.db import connection
from django.http import JsonResponse

__all__ = [
    "HEALTH_LIVE_PATH",
    "HEALTH_READY_PATH",
    "HealthCheckMiddleware",
]

# Liveness: the process answers requests. Readiness: it can also reach the database.
HEALTH_LIVE_PATH = "/api/health/live/"
HEALTH_READY_PATH = "/api/health/ready/"


class HealthCheckMiddleware:
    """
    Answers health checks (container healthchecks, Kubernetes probes) before any other middleware.

    Must be first in MIDDLEWARE: probes connect with the pod or container IP as Host, which is
    not in ALLOWED_HOSTS, so the response is returned before anything validates the host.
    No authentication is required and no information beyond the status is returned.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path == HEALTH_LIVE_PATH:
            return JsonResponse({"status": "ok"})
        if request.path == HEALTH_READY_PATH:
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
            except Exception:
                return JsonResponse({"status": "database unavailable"}, status=503)
            return JsonResponse({"status": "ok"})
        return self.get_response(request)
