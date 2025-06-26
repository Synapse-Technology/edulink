from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Internship, Application
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
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


from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def your_view(request):
      ...
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse

@ensure_csrf_cookie
def get_csrf_token(request):
       return JsonResponse({'message': 'CSRF cookie set'})
@csrf_exempt
def list_internships(request):
    internships = Internship.objects.filter(is_verified=True)
    data = [
        {
            "id": i.id,
            "title": i.title,
            "description": i.description,
            "employer_name": i.employer_name,
            "location": i.location,
            "is_verified": i.is_verified,
            "created_at": i.created_at,
        }
        for i in internships
    ]
    return JsonResponse(data, safe=False)
