from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from django.core.cache import cache
import logging
import time

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    """Health check endpoint for service discovery."""
    health_status = {
        'service': 'user-service',
        'status': 'healthy',
        'timestamp': int(time.time()),
        'checks': {}
    }
    
    # Check database connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status['checks']['database'] = 'healthy'
    except Exception as e:
        health_status['checks']['database'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'unhealthy'
        logger.error(f"Database health check failed: {e}")
    
    # Check Redis/Cache connectivity
    try:
        cache.set('health_check', 'test', 10)
        cache.get('health_check')
        health_status['checks']['cache'] = 'healthy'
    except Exception as e:
        health_status['checks']['cache'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'unhealthy'
        logger.error(f"Cache health check failed: {e}")
    
    # Check service-specific functionality
    try:
        from profiles.models import UserProfile
        UserProfile.objects.count()  # Simple query to test user service
        health_status['checks']['user_service'] = 'healthy'
    except Exception as e:
        health_status['checks']['user_service'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'unhealthy'
        logger.error(f"User service health check failed: {e}")
    
    status_code = 200 if health_status['status'] == 'healthy' else 503
    return JsonResponse(health_status, status=status_code)

@csrf_exempt
@require_http_methods(["GET"])
def readiness_check(request):
    """Readiness check endpoint for service discovery."""
    readiness_status = {
        'service': 'user-service',
        'ready': True,
        'timestamp': int(time.time()),
        'checks': {}
    }
    
    # Check if migrations are applied
    try:
        from django.db.migrations.executor import MigrationExecutor
        executor = MigrationExecutor(connection)
        plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
        if plan:
            readiness_status['checks']['migrations'] = 'pending'
            readiness_status['ready'] = False
        else:
            readiness_status['checks']['migrations'] = 'applied'
    except Exception as e:
        readiness_status['checks']['migrations'] = f'error: {str(e)}'
        readiness_status['ready'] = False
        logger.error(f"Migration check failed: {e}")
    
    # Check if essential services are available
    try:
        from django.conf import settings
        if hasattr(settings, 'SERVICE_DISCOVERY'):
            readiness_status['checks']['service_discovery'] = 'configured'
        else:
            readiness_status['checks']['service_discovery'] = 'not_configured'
    except Exception as e:
        readiness_status['checks']['service_discovery'] = f'error: {str(e)}'
        logger.error(f"Service discovery check failed: {e}")
    
    status_code = 200 if readiness_status['ready'] else 503
    return JsonResponse(readiness_status, status=status_code)