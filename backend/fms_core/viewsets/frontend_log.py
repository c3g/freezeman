import json
import logging

from django.conf import settings
from rest_framework import serializers, status, viewsets
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

__all__ = ["FrontendLogViewSet"]

logger = logging.getLogger("fms.frontend")

LEVELS: dict[str, int] = {
    "debug": logging.DEBUG,
    "info": logging.INFO,
    "warning": logging.WARNING,
    "error": logging.ERROR,
}


class FrontendLogEntrySerializer(serializers.Serializer):
    """
    One log entry sent by the frontend.
    """
    level = serializers.ChoiceField(choices=list(LEVELS.keys()))
    message = serializers.CharField(trim_whitespace=False)
    timestamp = serializers.DateTimeField()
    url = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    context = serializers.JSONField(required=False)

    def validate_message(self, value: str) -> str:
        """
        Reject messages longer than `FRONTEND_LOGGING["MAX_MESSAGE_LENGTH"]`.

        Args:
            `value`: Message of the entry.

        Returns:
            The unchanged message.
        """
        # Read at validation time (not in the field definition) so that a settings change applies without reload.
        max_length: int = settings.FRONTEND_LOGGING["MAX_MESSAGE_LENGTH"]
        if len(value) > max_length:
            raise serializers.ValidationError(f"Ensure this field has no more than {max_length} characters.")
        return value


class FrontendLogViewSet(viewsets.ViewSet):
    """
    Receive log entries that the frontend sends explicitly and write them to the `fms.frontend` logger.
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "frontend-logs"

    def create(self, request: Request) -> Response:
        """
        Write one frontend log entry to the `fms.frontend` logger.

        Args:
            `request`: Request with body `{"level", "message", "timestamp", "url"?, "context"?}`.

        Returns:
            204 if the entry is valid, else 400 with the validation errors.
        """
        serializer = FrontendLogEntrySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        entry = serializer.validated_data
        logger.log(
            LEVELS[entry["level"]],
            "[frontend] user=%s url=%s client_time=%s %s context=%s",
            request.user.get_username(),
            entry.get("url", ""),
            entry["timestamp"].isoformat(),
            entry["message"],
            json.dumps(entry.get("context"), default=str),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

