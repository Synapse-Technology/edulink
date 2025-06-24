from django.contrib import admin
from .models import Internship, Application, SupervisorFeedback

admin.site.register(Internship)
admin.site.register(Application)
admin.site.register(SupervisorFeedback)

# Register your models here.
