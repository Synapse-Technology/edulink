from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Internship, Application
from django.http import JsonResponse, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie

@csrf_exempt
@login_required
def list_internships(request):
    # Check if the user is in the 'STUDENT' group
    if not request.user.groups.filter(name='STUDENT').exists():
        return HttpResponseForbidden("Only students can view internships.")
        
    internships = Internship.objects.filter(is_verified=True)
    return render(request, 'applications/internships_list.html', {'internships': internships})

@login_required
def apply_to_internship(request, internship_id):
    # Check if the user is in the 'STUDENT' group
    if not request.user.groups.filter(name='STUDENT').exists():
        return HttpResponseForbidden("Only students can apply for internships.")

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

@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({'message': 'CSRF cookie set'})
