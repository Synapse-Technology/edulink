from django.db import OperationalError
from django.test import RequestFactory, SimpleTestCase

from edulink.apps.shared.exceptions import edulink_exception_handler


class TestEduLinkExceptionHandler(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_operational_error_returns_retryable_503(self):
        request = self.factory.get("/api/internships/success-stories/")
        exc = OperationalError("[Errno -3] Temporary failure in name resolution")

        response = edulink_exception_handler(exc, {"request": request})

        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["error_code"], "DATABASE_UNAVAILABLE")
        self.assertEqual(response.data["status_code"], 503)
        self.assertIn("temporarily unavailable", response.data["message"].lower())
