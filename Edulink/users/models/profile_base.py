from django.db import models

# Create your models here.


class ProfileBase(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20, unique=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True,
                                        blank=True, default='profile_pics/default.jpg')
    phone_verified = models.BooleanField(default=False)  # type: ignore[attr-defined]
    is_active = models.BooleanField(default=True)  # type: ignore[attr-defined]
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)  # type: ignore[attr-defined]
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.user.email})"  # type: ignore[attr-defined]
