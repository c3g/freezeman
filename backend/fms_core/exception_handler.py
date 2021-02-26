from rest_framework.views import exception_handler
from rest_framework import status
from rest_framework.response import Response
from django.core.exceptions import ValidationError


def fms_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    # Forward validation error message to the front end
    if isinstance(exc, ValidationError):
        response = Response(data={}, status=status.HTTP_400_BAD_REQUEST)
        for error in exc.message_dict:
            response.data[error] = exc.message_dict[error]

    return response
