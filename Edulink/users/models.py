from django.db import models

# SystemSetting model removed; now in models/system_setting.py

class SystemSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.CharField(max_length=500)
    def __str__(self):
        return f"{self.key}: {self.value}" 