from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import traceback
import sys

def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        return response

    # If response is None, it's likely a 500 error
    exc_type, exc_value, exc_traceback = sys.exc_info()
    tb = traceback.format_exception(exc_type, exc_value, exc_traceback)
    return Response(
        {
            "error": str(exc),
            "traceback": tb,
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    ) 