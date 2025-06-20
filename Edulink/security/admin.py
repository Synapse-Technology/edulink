from django.contrib import admin
from .models import LoginHistory, SecurityLog

admin.site.register(LoginHistory)
admin.site.register(SecurityLog)
