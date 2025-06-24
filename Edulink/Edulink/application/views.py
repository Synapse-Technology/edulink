from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Internship, Application
from django.http import JsonResponse

@login_required
def list_internships(request):
    internships = Internship.objects.filter(is_verified=True)
    return render(request, 'applications/internships_list.html', {'internships': internships})

@login_required
def apply_to_internship(request, internship_id):
    internship = get_object_or_404(Internship, id=internship_id)
    application, created = Application.objects.get_or_create(
        student=request.user,
        internship=internship
    )
    if created:
        message = "Application submitted successfully."
    else:
        message = "You have already applied."
    return JsonResponse({'message': message})


# Create your views here.
