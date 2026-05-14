from django.conf import settings
from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken


REFRESH_MAX_AGE_SECONDS = 14 * 24 * 60 * 60


def refresh_cookie_samesite() -> str:
    return "None" if not settings.DEBUG else "Lax"


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=REFRESH_MAX_AGE_SECONDS,
        secure=not settings.DEBUG,
        httponly=True,
        samesite=refresh_cookie_samesite(),
        path="/",
        domain=getattr(settings, "JWT_COOKIE_DOMAIN", None),
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key="refresh_token",
        path="/",
        domain=getattr(settings, "JWT_COOKIE_DOMAIN", None),
        samesite=refresh_cookie_samesite(),
    )


def build_login_response(*, request, user, user_data: dict, message: str = "Login successful") -> Response:
    refresh = RefreshToken.for_user(user)
    response = Response(
        {
            "message": message,
            "user": user_data,
            "access": str(refresh.access_token),
        },
        status=status.HTTP_200_OK,
    )
    set_refresh_cookie(response, str(refresh))
    response["X-CSRFToken"] = get_token(request)
    return response


def build_refresh_response(*, request, access_token: str, refresh_token: str | None = None) -> Response:
    response = Response(
        {
            "message": "Token refreshed successfully",
            "access": access_token,
        },
        status=status.HTTP_200_OK,
    )
    if refresh_token:
        set_refresh_cookie(response, refresh_token)
    response["X-CSRFToken"] = get_token(request)
    return response
