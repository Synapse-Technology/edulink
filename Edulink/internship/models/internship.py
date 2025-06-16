from django.db import models
from django.contrib.auth.models import AbstractUser
# Create your models here.

# Extend AbstractUser if companies log in
class User(AbstractUser):
    is_company = models.BooleanField(default=False)

class Company(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    website = models.URLField(blank=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name
