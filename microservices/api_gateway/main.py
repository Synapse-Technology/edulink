from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import logging
import time
from typing import Optional, Dict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Service registry
class SimpleServiceRegistry:
    def __init__(self):
        self.services: Dict[str, str] = {
            "auth": "http://127.0.0.1:8001",
            "registration_service": "http://127.0.0.1:8002",
            "user": "http://127.0.0.1:8003",
            "internship": "http://127.0.0.1:8004",
            "application": "http://127.0.0.1:8005",
            "notification": "http://127.0.0.1:8006",
            "institution": "http://127.0.0.1:8007"
        }
    
    def get_service_url(self, service_name: str) -> str:
        if service_name not in self.services:
            raise HTTPException(status_code=404, detail=f"Service {service_name} not found")
        return self.services[service_name]

service_registry = SimpleServiceRegistry()

# Initialize FastAPI app
app = FastAPI(
    title="Edulink API Gateway",
    description="API Gateway for Edulink Microservices",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service registry is already initialized above

# Health check endpoint
@app.get("/health")
async def health_check():
    """API Gateway health check"""
    return {
        "status": "healthy",
        "service": "api_gateway",
        "timestamp": time.time()
    }

# Service health aggregation
@app.get("/health/services")
async def services_health():
    """Check health of all registered services"""
    services_status = {}
    
    async with httpx.AsyncClient() as client:
        for service_name, service_url in service_registry.services.items():
            try:
                response = await client.get(f"{service_url}/health/", timeout=5.0)
                services_status[service_name] = {
                    "status": "healthy" if response.status_code == 200 else "unhealthy",
                    "response_time": response.elapsed.total_seconds(),
                    "status_code": response.status_code
                }
            except Exception as e:
                services_status[service_name] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
    
    all_healthy = all(s["status"] == "healthy" for s in services_status.values())
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "services": services_status,
        "timestamp": time.time()
    }

# Generic proxy function
async def proxy_request(
    request: Request,
    service_name: str,
    path: str,
    method: str = "GET"
):
    """Proxy requests to microservices"""
    try:
        service_url = service_registry.get_service_url(service_name)
        target_url = f"{service_url}{path}"
        
        # Get request body if present
        body = None
        if method in ["POST", "PUT", "PATCH"]:
            body = await request.body()
        
        # Forward headers (excluding host)
        headers = dict(request.headers)
        headers.pop('host', None)
        
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=target_url,
                headers=headers,
                content=body,
                params=dict(request.query_params),
                timeout=30.0
            )
            
            return JSONResponse(
                content=response.json() if response.content else {},
                status_code=response.status_code,
                headers=dict(response.headers)
            )
            
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error from {service_name}: {e.response.status_code}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Service error: {e.response.text}")
    except httpx.TimeoutException:
        logger.error(f"Timeout calling {service_name} service")
        raise HTTPException(status_code=504, detail="Service timeout")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Internship service routes
@app.api_route("/api/v1/internships/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], operation_id="internship_proxy")
async def internship_proxy(request: Request, path: str):
    """Proxy requests to internship service"""
    return await proxy_request(request, "internship", f"/api/v1/internships/{path}", request.method)

# Application service routes
@app.api_route("/api/v1/applications/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], operation_id="application_proxy")
async def application_proxy(request: Request, path: str):
    """Proxy requests to application service"""
    return await proxy_request(request, "application", f"/api/v1/applications/{path}", request.method)

# Authentication service routes
@app.api_route("/api/v1/auth/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], operation_id="auth_proxy")
async def auth_proxy(request: Request, path: str):
    """Proxy requests to authentication service"""
    return await proxy_request(request, "auth", f"/api/v1/auth/{path}", request.method)

# User service routes
@app.api_route("/api/v1/users/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], operation_id="user_proxy")
async def user_proxy(request: Request, path: str):
    """Proxy requests to user service"""
    return await proxy_request(request, "user", f"/api/v1/users/{path}", request.method)

@app.api_route("/api/v1/profiles/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], operation_id="user_profiles_proxy")
async def user_profiles_proxy(request: Request, path: str):
    """Proxy requests to user service for profiles"""
    return await proxy_request(request, "user", f"/api/v1/profiles/{path}", request.method)

# Institution service routes
@app.api_route("/api/v1/institutions/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], operation_id="institution_proxy")
async def institution_proxy(request: Request, path: str):
    """Proxy requests to institution service"""
    return await proxy_request(request, "institution", f"/api/v1/institutions/{path}", request.method)

# Notification service routes
@app.api_route("/api/v1/notifications/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], operation_id="notification_proxy")
async def notification_proxy(request: Request, path: str):
    """Proxy requests to notification service"""
    return await proxy_request(request, "notification", f"/api/v1/notifications/{path}", request.method)

# Registration service routes
@app.api_route("/api/registration/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], operation_id="registration_proxy")
async def registration_proxy(request: Request, path: str):
    """Proxy requests to registration service"""
    return await proxy_request(request, "registration_service", f"/api/registration/{path}", request.method)

@app.api_route("/api/v1/registration/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], operation_id="registration_v1_proxy")
async def registration_v1_proxy(request: Request, path: str):
    """Proxy requests to registration service (v1 API)"""
    return await proxy_request(request, "registration_service", f"/api/v1/registration/{path}", request.method)

# Legacy monolith compatibility routes for student registration
@app.api_route("/api/auth/register/student/", methods=["POST"], operation_id="legacy_student_registration")
async def legacy_student_registration(request: Request):
    """Legacy compatibility route for student registration - redirects to Auth Service"""
    logger.info("Legacy student registration request received, routing to Auth Service")
    return await proxy_request(request, "auth", "/api/v1/auth/register/student/", "POST")

@app.api_route("/api/auth/login/", methods=["POST"], operation_id="legacy_login")
async def legacy_login(request: Request):
    """Legacy compatibility route for login - redirects to Auth Service"""
    logger.info("Legacy login request received, routing to Auth Service")
    return await proxy_request(request, "auth", "/api/v1/auth/login/", "POST")

@app.api_route("/api/auth/logout/", methods=["POST"], operation_id="legacy_logout")
async def legacy_logout(request: Request):
    """Legacy compatibility route for logout - redirects to Auth Service"""
    logger.info("Legacy logout request received, routing to Auth Service")
    return await proxy_request(request, "auth", "/api/v1/auth/logout/", "POST")

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Endpoint not found"}
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    logger.error(f"Internal server error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )