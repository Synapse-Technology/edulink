from django.contrib import admin
from .models import LoginHistory, SecurityLog


@admin.register(LoginHistory)
class LoginHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'ip_address', 'timestamp')
    list_filter = ('timestamp',)
    search_fields = ('user__email', 'ip_address')
    readonly_fields = ('timestamp',)
    ordering = ('-timestamp',)


@admin.register(SecurityLog)
class SecurityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'ip_address', 'timestamp')
    list_filter = ('action', 'timestamp')
    search_fields = ('user__email', 'description', 'ip_address')
    readonly_fields = ('timestamp',)
    ordering = ('-timestamp',)