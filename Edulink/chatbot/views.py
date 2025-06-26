from django.shortcuts import render

# Create your views here.
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import google.generativeai as genai
import json

@csrf_exempt
def edi_chat(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        user_message = data.get('message', '')

        genai.configure(api_key=settings.GOOGLE_GEMINI_API_KEY)
        try:
            # Try flash model first for quota flexibility
            try:
                model = genai.GenerativeModel('models/gemini-1.5-flash-latest')
                response = model.generate_content(user_message)
                ai_reply = response.text
            except Exception:
                # Fallback to pro model if flash is exhausted
                model = genai.GenerativeModel('models/gemini-1.5-pro-latest')
                response = model.generate_content(user_message)
                ai_reply = response.text
        except Exception as e:
            ai_reply = (
                "Sorry, Edi's AI brain is taking a break due to high demand. "
                "Please try again later or visit our <a href='support.html'>Support Page</a> for help."
            )
        return JsonResponse({'reply': ai_reply})
    return JsonResponse({'error': 'Invalid request'}, status=400) 