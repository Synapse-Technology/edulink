from django.db import models

# Create your models here.
from authentication.models import User

class ProfileBase(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='%(class)s_profile')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20, unique=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True, default='profile_pics/default.jpg')
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.user.email})"

