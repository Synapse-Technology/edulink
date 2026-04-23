"""
Shared API response caching middleware for EduLink.

This middleware behaves like a small reverse-proxy cache for a narrow set of
public GET endpoints. It is intentionally strict:

- Authenticated requests are never shared-cached unless the route is explicitly
  marked safe for authenticated responses.
- User-specific internship data (for example student_has_applied) is never
  cached for authenticated users.
- Non-JSON, non-200, or mutating responses bypass caching.
"""

from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass
from typing import Callable, Optional

from django.conf import settings
from django.core.cache import cache
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.utils.cache import patch_vary_headers

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CacheRule:
    """Defines a cacheable API path pattern."""

    name: str
    pattern: re.Pattern[str]
    ttl_seconds: int
    allow_authenticated: bool = False


class PublicApiCacheMiddleware:
    """
    Cache safe public API GET responses and set defensive cache headers.

    The goal is to reduce repeated backend work for anonymous or auth-safe
    endpoints while avoiding any cross-user leakage.
    """

    default_rules = (
        CacheRule(
            name="internships_list",
            pattern=re.compile(r"^/api/internships/$"),
            ttl_seconds=300,
            allow_authenticated=False,
        ),
        CacheRule(
            name="internships_detail",
            pattern=re.compile(r"^/api/internships/[0-9a-fA-F-]{36}/$"),
            ttl_seconds=300,
            allow_authenticated=False,
        ),
        CacheRule(
            name="internships_success_stories",
            pattern=re.compile(r"^/api/internships/success-stories/$"),
            ttl_seconds=900,
            allow_authenticated=True,
        ),
        CacheRule(
            name="employers_list",
            pattern=re.compile(r"^/api/employers/employers/$"),
            ttl_seconds=900,
            allow_authenticated=True,
        ),
    )

    def __init__(self, get_response: Callable):
        self.get_response = get_response
        self.rules = getattr(settings, "PUBLIC_API_CACHE_RULES", self.default_rules)

    def __call__(self, request: HttpRequest) -> HttpResponse:
        rule = self._match_rule(request.path_info)
        if not rule or request.method not in {"GET", "HEAD"}:
            return self.get_response(request)

        if self._request_is_authenticated(request) and not rule.allow_authenticated:
            response = self.get_response(request)
            return self._mark_private(response)

        cache_key = self._build_cache_key(rule.name, request)
        cached_payload = cache.get(cache_key)
        if cached_payload:
            logger.debug("Public API cache hit", extra={"path": request.path_info, "rule": rule.name})
            return self._response_from_payload(cached_payload)

        response = self.get_response(request)
        response = self._decorate_response(response, request, rule)

        if self._is_cacheable_response(response, request, rule):
            cache.set(cache_key, self._payload_from_response(response), rule.ttl_seconds)
            logger.debug("Public API cache stored", extra={"path": request.path_info, "rule": rule.name})

        return response

    def _match_rule(self, path: str) -> Optional[CacheRule]:
        for rule in self.rules:
            if rule.pattern.match(path):
                return rule
        return None

    def _request_is_authenticated(self, request: HttpRequest) -> bool:
        user = getattr(request, "user", None)
        return bool(user and getattr(user, "is_authenticated", False))

    def _build_cache_key(self, rule_name: str, request: HttpRequest) -> str:
        query = request.META.get("QUERY_STRING", "")
        key_source = f"{request.method}:{request.path_info}?{query}"
        digest = hashlib.sha256(key_source.encode("utf-8")).hexdigest()
        return f"public-api:{rule_name}:{digest}"

    def _decorate_response(self, response: HttpResponse, request: HttpRequest, rule: CacheRule) -> HttpResponse:
        if self._is_cacheable_response(response, request, rule):
            response.headers["Cache-Control"] = (
                f"public, max-age={rule.ttl_seconds}, s-maxage={rule.ttl_seconds}, "
                "stale-while-revalidate=60"
            )
            patch_vary_headers(response, ["Accept", "Accept-Encoding"])
        else:
            self._mark_private(response)

        return response

    def _mark_private(self, response: HttpResponse) -> HttpResponse:
        response.headers["Cache-Control"] = "private, no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        patch_vary_headers(response, ["Authorization", "Cookie", "Accept", "Accept-Encoding"])
        return response

    def _is_cacheable_response(self, response: HttpResponse, request: HttpRequest, rule: CacheRule) -> bool:
        if request.method not in {"GET", "HEAD"}:
            return False
        if response.status_code != 200:
            return False
        if getattr(response, "streaming", False):
            return False
        if response.has_header("Set-Cookie"):
            return False
        content_type = response.headers.get("Content-Type", "")
        if "application/json" not in content_type:
            return False
        if self._request_is_authenticated(request) and not rule.allow_authenticated:
            return False
        return True

    def _payload_from_response(self, response: HttpResponse) -> dict:
        return {
            "body": bytes(response.content),
            "status_code": response.status_code,
            "content_type": response.headers.get("Content-Type", "application/json"),
            "headers": {
                key: value
                for key, value in response.headers.items()
                if key.lower() not in {"content-length", "content-type"}
            },
        }

    def _response_from_payload(self, payload: dict) -> HttpResponse:
        response = HttpResponse(
            content=payload["body"],
            status=payload["status_code"],
            content_type=payload["content_type"],
        )

        for key, value in payload.get("headers", {}).items():
            response.headers[key] = value

        return response
