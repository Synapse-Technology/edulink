from django.contrib import admin
from django.contrib.admin.models import LogEntry
from django.contrib.admin.sites import AdminSite
from .models import Invite, User

class CustomAdminSite(AdminSite):
    def log_addition(self, request, object, message):
        """
        Log that an object has been successfully added.
        """
        return LogEntry.objects.log_action(
            user_id=str(request.user.pk) if request.user.is_authenticated else None,
            content_type_id=None,
            object_id=str(object.pk),
            object_repr=str(object),
            action_flag=LogEntry.ADDITION,
            change_message=message,
        )

    def log_change(self, request, object, message):
        """
        Log that an object has been successfully changed.
        """
        return LogEntry.objects.log_action(
            user_id=str(request.user.pk) if request.user.is_authenticated else None,
            content_type_id=None,
            object_id=str(object.pk),
            object_repr=str(object),
            action_flag=LogEntry.CHANGE,
            change_message=message,
        )

    def log_deletion(self, request, object, object_repr):
        """
        Log that an object will be deleted.
        """
        return LogEntry.objects.log_action(
            user_id=str(request.user.pk) if request.user.is_authenticated else None,
            content_type_id=None,
            object_id=str(object.pk),
            object_repr=object_repr,
            action_flag=LogEntry.DELETION,
            change_message='',
        )

# Create custom admin site instance
admin_site = CustomAdminSite(name='admin')

# Register models with custom admin site
@admin.register(Invite, site=admin_site)
class InviteAdmin(admin.ModelAdmin):
    list_display = ('email', 'role', 'token', 'is_used', 'invited_by', 'created_at')
    list_filter = ('role', 'is_used', 'created_at')
    search_fields = ('email', 'token', 'invited_by__email')
    readonly_fields = ('token', 'created_at')

    def has_change_permission(self, request, obj=None):
        # Prevent editing used invites
        if obj and obj.is_used:
            return False
        return super().has_change_permission(request, obj)

@admin.register(User, site=admin_site)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'role', 'is_active', 'date_joined')
    list_filter = ('role', 'is_active', 'date_joined')
    search_fields = ('email', 'institution', 'phone_number')
    readonly_fields = ('date_joined',)

# Monkey patch LogEntry to handle UUID user IDs
def get_user_id(self):
    return str(self.user_id) if self.user_id else None

LogEntry.get_user_id = get_user_id
