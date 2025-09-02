from django.db import models

class SystemSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.CharField(max_length=500)

    def __str__(self):
        return f"{self.key}: {self.value}"

    class Meta:
        verbose_name = "System Setting"
        verbose_name_plural = "System Settings"