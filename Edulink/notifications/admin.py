from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'message', 'notification_type', 'timestamp', 'is_read', 'status')
    list_filter = ('notification_type', 'is_read', 'status', 'timestamp')
    search_fields = ('user__email', 'message')
    raw_id_fields = ('user', 'related_application', 'related_internship') # Useful for ForeignKey fields