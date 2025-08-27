from django.http import JsonResponse
from django.db import connection
from django.conf import settings
import logging
import time

logger = logging.getLogger(__name__)

def health_check(request):
    """Basic health check endpoint"""
    return JsonResponse({
        'status': 'healthy',
        'service': 'application_service',
        'timestamp': time.time()
    })

def readiness_check(request):
    """Readiness check - verifies service dependencies"""
    checks = {
        'database': False,
        'cache': False,
        'internship_service': False,
    }
    
    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        checks['database'] = True
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
    
    # Check cache connection
    try:
        from django.core.cache import cache
        cache.set('health_check', 'test', 10)
        cache.get('health_check')
        checks['cache'] = True
    except Exception as e:
        logger.error(f"Cache health check failed: {str(e)}")
    
    # Check internship service connection
    try:
        import requests
        from service_config import get_config
        config = get_config()
        response = requests.get(
            f"{config.INTERNSHIP_SERVICE_URL}/health/",
            timeout=5
        )
        checks['internship_service'] = response.status_code == 200
    except Exception as e:
        logger.error(f"Internship service health check failed: {str(e)}")
    
    all_healthy = all(checks.values())
    status_code = 200 if all_healthy else 503
    
    return JsonResponse({
        'status': 'ready' if all_healthy else 'not_ready',
        'service': 'application_service',
        'checks': checks,
        'timestamp': time.time()
    }, status=status_code)

def liveness_check(request):
    """Liveness check - verifies service is running"""
    return JsonResponse({
        'status': 'alive',
        'service': 'application_service',
        'timestamp': time.time()
    })