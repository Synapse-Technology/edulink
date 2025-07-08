from django.contrib import admin
from .models import User, EmailOTP, Invite, CustomAdminLog

# Create a custom AdminSite to handle UUIDs if needed, though modern Django handles it.
# For now, we can use the default site for simplicity unless specific overrides are needed.


class UserAdmin(admin.ModelAdmin):
    list_display = (
        "email",
        "role",
        "is_staff",
        "is_superuser",
        "is_active",
        "date_joined",
    )
    list_filter = ("role", "is_staff", "is_superuser", "is_active")
    search_fields = ("email", "role")
    ordering = ("-date_joined",)


class InviteAdmin(admin.ModelAdmin):
    list_display = ("email", "role", "is_used", "invited_by", "created_at")
    list_filter = ("role", "is_used")
    search_fields = ("email", "role")
    readonly_fields = ("token",)


class EmailOTPAdmin(admin.ModelAdmin):
    list_display = ("email", "created_at")
    search_fields = ("email",)


class CustomAdminLogAdmin(admin.ModelAdmin):
    list_display = ("action_time", "user", "object_repr", "action_flag")
    list_filter = ("action_flag",)
    search_fields = ("user__email", "object_repr")


admin.site.register(User, UserAdmin)
admin.site.register(Invite, InviteAdmin)
admin.site.register(EmailOTP, EmailOTPAdmin)
admin.site.register(CustomAdminLog, CustomAdminLogAdmin)
