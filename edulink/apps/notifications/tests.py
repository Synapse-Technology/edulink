import uuid
from unittest.mock import patch

from django.core import mail
from django.test import TestCase, override_settings

from edulink.apps.notifications.models import Notification
from edulink.apps.notifications.services import (
    _send_email_notification_sync,
    send_email_notification,
)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="Edulink <no-reply@edulinkcareer.me>",
    SUPPORT_EMAIL="support@edulinkcareer.me",
    FRONTEND_URL="https://edulinkcareer.me",
)
class EmailNotificationServiceTests(TestCase):
    def setUp(self):
        mail.outbox = []

    @patch("edulink.apps.notifications.services.record_event")
    def test_sync_sender_sends_html_alternative_email(self, record_event):
        notification = Notification.objects.create(
            recipient_id=uuid.uuid4(),
            type=Notification.TYPE_LOGBOOK_REPORT_GENERATED,
            channel=Notification.CHANNEL_EMAIL,
            status=Notification.STATUS_PENDING,
            title="Your logbook report is ready",
            body="A comprehensive report of your internship logbooks has been compiled.",
            template_name="logbook_report_generated",
        )

        sent = _send_email_notification_sync(
            notification_id=str(notification.id),
            recipient_email="student@example.com",
            subject="Your logbook report is ready",
            template_name="logbook_report_generated",
            context={
                "student_name": "Demo Student",
                "employer_name": "Demo Employer",
                "logbooks_count": 12,
                "tracking_code": "ELK-123",
                "dashboard_url": "https://edulinkcareer.me/dashboard/student/artifacts",
            },
        )

        self.assertTrue(sent)
        notification.refresh_from_db()
        self.assertEqual(notification.status, Notification.STATUS_SENT)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].alternatives[0][1], "text/html")
        self.assertEqual(mail.outbox[0].extra_headers["Reply-To"], "support@edulinkcareer.me")
        record_event.assert_called_once()

    @patch("edulink.apps.notifications.services.trigger_pusher_event")
    @patch("edulink.apps.notifications.services.async_task")
    def test_report_template_maps_to_report_notification_type(self, async_task, trigger_pusher_event):
        with self.captureOnCommitCallbacks(execute=True):
            sent = send_email_notification(
                recipient_email="student@example.com",
                subject="Your logbook report is ready",
                template_name="logbook_report_generated",
                context={
                    "student_name": "Demo Student",
                    "employer_name": "Demo Employer",
                    "logbooks_count": 12,
                    "tracking_code": "ELK-123",
                    "dashboard_url": "https://edulinkcareer.me/dashboard/student/artifacts",
                },
            )

        self.assertTrue(sent)
        notification = Notification.objects.get(recipient_id=uuid.uuid5(uuid.NAMESPACE_URL, "mailto:student@example.com"))
        self.assertEqual(notification.type, Notification.TYPE_LOGBOOK_REPORT_GENERATED)
        async_task.assert_called_once()
        trigger_pusher_event.assert_called_once()
