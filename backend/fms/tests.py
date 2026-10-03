from unittest.mock import patch

from django.db import OperationalError
from django.test import TestCase, override_settings

from .health import HEALTH_LIVE_PATH, HEALTH_READY_PATH


# Probes use the pod or container IP as Host, which is not an allowed host.
@override_settings(ALLOWED_HOSTS=["fms.example.com"])
class HealthCheckTest(TestCase):
    def test_live(self):
        response = self.client.get(HEALTH_LIVE_PATH, HTTP_HOST="10.0.0.12:8000")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_ready(self):
        response = self.client.get(HEALTH_READY_PATH, HTTP_HOST="10.0.0.12:8000")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_ready_without_database(self):
        with patch("fms.health.connection.cursor", side_effect=OperationalError):
            response = self.client.get(HEALTH_READY_PATH, HTTP_HOST="10.0.0.12:8000")
        self.assertEqual(response.status_code, 503)

    def test_other_paths_still_validate_host(self):
        response = self.client.get("/api/info/", HTTP_HOST="10.0.0.12:8000")
        self.assertEqual(response.status_code, 400)
