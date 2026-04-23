"""
Tests for the public API cache middleware.
"""

from __future__ import annotations

import json
from types import SimpleNamespace
from uuid import uuid4

from django.core.cache import cache
from django.http import JsonResponse
from django.test import RequestFactory, TestCase

from edulink.apps.shared.cache_middleware import PublicApiCacheMiddleware


class PublicApiCacheMiddlewareTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        cache.clear()

    def test_anonymous_public_internships_are_cached(self):
        call_count = {"count": 0}

        def view(request):
            call_count["count"] += 1
            return JsonResponse({"results": [{"id": "1"}]})

        middleware = PublicApiCacheMiddleware(view)
        request = self.factory.get('/api/internships/?status=OPEN')
        request.user = SimpleNamespace(is_authenticated=False)

        first_response = middleware(request)
        second_response = middleware(request)

        self.assertEqual(call_count["count"], 1)
        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(first_response.content, second_response.content)
        self.assertIn('public', first_response["Cache-Control"])

    def test_authenticated_internships_bypass_shared_cache(self):
        call_count = {"count": 0}

        def view(request):
            call_count["count"] += 1
            return JsonResponse({"results": [{"id": "1", "student_has_applied": True}]})

        middleware = PublicApiCacheMiddleware(view)
        request = self.factory.get('/api/internships/?status=OPEN')
        request.user = SimpleNamespace(is_authenticated=True, id=uuid4())

        first_response = middleware(request)
        second_response = middleware(request)

        self.assertEqual(call_count["count"], 2)
        self.assertIn('no-store', first_response["Cache-Control"])
        self.assertIn('private', first_response["Cache-Control"])
        self.assertEqual(first_response.content, second_response.content)

    def test_auth_safe_public_endpoints_can_cache_for_authenticated_users(self):
        call_count = {"count": 0}

        def view(request):
            call_count["count"] += 1
            return JsonResponse({"results": [{"id": "employer-1"}]})

        middleware = PublicApiCacheMiddleware(view)
        request = self.factory.get('/api/employers/employers/?is_featured=true')
        request.user = SimpleNamespace(is_authenticated=True, id=uuid4())

        first_response = middleware(request)
        second_response = middleware(request)

        self.assertEqual(call_count["count"], 1)
        self.assertIn('public', first_response["Cache-Control"])
        self.assertEqual(json.loads(first_response.content), json.loads(second_response.content))
