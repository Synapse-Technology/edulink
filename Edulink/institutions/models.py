from django.db import models

class Institution(models.Model):
    name = models.CharField(max_length=255)
    institution_type = models.CharField(max_length=100)  # e.g., University, College, TVET
    registration_number = models.CharField(max_length=100, unique=True)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20)
    website = models.URLField(blank=True, null=True)
    address = models.CharField(max_length=255)
    
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def profile(self):
        """Get the associated institution profile if it exists"""
        return getattr(self, 'institutionprofile', None)

class Course(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name='courses')
    description = models.TextField(blank=True)
    duration_years = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code}) - {self.institution.name}"

    class Meta:
        unique_together = ['name', 'institution']


