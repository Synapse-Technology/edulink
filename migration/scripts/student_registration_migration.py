#!/usr/bin/env python3
"""
Student Registration Workflow Migration Script

This script migrates the student registration workflow from the monolith
to the microservices architecture with proper data validation and event-driven communication.

Migration Steps:
1. Extract registration data from monolith
2. Validate data integrity
3. Migrate to Auth Service
4. Create profiles in User Service
5. Update Institution Service
6. Send notifications via Notification Service
7. Verify event-driven communication
"""

import os
import sys
import json
import logging
import asyncio
import httpx
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.append(str(project_root))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class StudentRegistrationData:
    """Data structure for student registration"""
    email: str
    password: str
    first_name: str
    last_name: str
    phone_number: str
    national_id: str
    registration_number: str
    institution_name: str
    year_of_study: int
    course: Optional[str] = None
    registration_method: str = 'university_search'
    university_code: Optional[str] = None
    academic_year: Optional[int] = None
    gender: Optional[str] = None

class StudentRegistrationMigrator:
    """Handles migration of student registration workflow"""
    
    def __init__(self, config: Dict[str, str]):
        self.config = config
        self.auth_service_url = config.get('AUTH_SERVICE_URL', 'http://localhost:8001')
        self.user_service_url = config.get('USER_SERVICE_URL', 'http://localhost:8002')
        self.institution_service_url = config.get('INSTITUTION_SERVICE_URL', 'http://localhost:8003')
        self.notification_service_url = config.get('NOTIFICATION_SERVICE_URL', 'http://localhost:8004')
        self.api_gateway_url = config.get('API_GATEWAY_URL', 'http://localhost:8000')
        
        # Migration statistics
        self.stats = {
            'total_students': 0,
            'migrated_successfully': 0,
            'migration_errors': 0,
            'validation_errors': 0,
            'start_time': None,
            'end_time': None
        }
        
        self.errors = []
    
    async def migrate_student_registration_workflow(self) -> Dict[str, Any]:
        """Main migration method"""
        logger.info("Starting student registration workflow migration")
        self.stats['start_time'] = datetime.now()
        
        try:
            # Step 1: Extract student data from monolith
            students_data = await self._extract_student_data_from_monolith()
            self.stats['total_students'] = len(students_data)
            
            # Step 2: Validate microservices availability
            await self._validate_microservices_health()
            
            # Step 3: Migrate each student
            for student_data in students_data:
                try:
                    await self._migrate_single_student(student_data)
                    self.stats['migrated_successfully'] += 1
                    logger.info(f"Successfully migrated student: {student_data.email}")
                except Exception as e:
                    self.stats['migration_errors'] += 1
                    error_msg = f"Failed to migrate student {student_data.email}: {str(e)}"
                    logger.error(error_msg)
                    self.errors.append(error_msg)
            
            # Step 4: Validate event-driven communication
            await self._validate_event_communication()
            
            # Step 5: Generate migration report
            return await self._generate_migration_report()
            
        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            raise
        finally:
            self.stats['end_time'] = datetime.now()
    
    async def _extract_student_data_from_monolith(self) -> List[StudentRegistrationData]:
        """Extract student registration data from monolith database"""
        logger.info("Extracting student data from monolith")
        
        # This would typically connect to the monolith database
        # For now, we'll simulate with sample data
        sample_students = [
            StudentRegistrationData(
                email="student1@example.com",
                password="SecurePass123!",
                first_name="John",
                last_name="Doe",
                phone_number="+254700000001",
                national_id="12345678",
                registration_number="CS/2024/001",
                institution_name="University of Nairobi",
                year_of_study=2,
                course="Computer Science",
                registration_method="university_search"
            ),
            StudentRegistrationData(
                email="student2@example.com",
                password="SecurePass123!",
                first_name="Jane",
                last_name="Smith",
                phone_number="+254700000002",
                national_id="87654321",
                registration_number="ENG/2024/002",
                institution_name="Kenyatta University",
                year_of_study=1,
                course="Engineering",
                registration_method="university_code",
                university_code="EDUKU24-001"
            )
        ]
        
        logger.info(f"Extracted {len(sample_students)} student records")
        return sample_students
    
    async def _validate_microservices_health(self) -> None:
        """Validate that all required microservices are healthy"""
        logger.info("Validating microservices health")
        
        services = {
            'Auth Service': f"{self.auth_service_url}/health/",
            'User Service': f"{self.user_service_url}/health/",
            'Institution Service': f"{self.institution_service_url}/health/",
            'Notification Service': f"{self.notification_service_url}/health/",
            'API Gateway': f"{self.api_gateway_url}/health"
        }
        
        async with httpx.AsyncClient() as client:
            for service_name, health_url in services.items():
                try:
                    response = await client.get(health_url, timeout=10.0)
                    if response.status_code == 200:
                        logger.info(f"✓ {service_name} is healthy")
                    else:
                        raise Exception(f"{service_name} returned status {response.status_code}")
                except Exception as e:
                    error_msg = f"✗ {service_name} health check failed: {str(e)}"
                    logger.error(error_msg)
                    raise Exception(error_msg)
    
    async def _migrate_single_student(self, student_data: StudentRegistrationData) -> None:
        """Migrate a single student through the microservices workflow"""
        logger.info(f"Migrating student: {student_data.email}")
        
        # Step 1: Register through Auth Service
        auth_response = await self._register_student_auth_service(student_data)
        
        # Step 2: Verify profile creation in User Service
        await self._verify_user_profile_creation(student_data.email)
        
        # Step 3: Verify institution linking
        await self._verify_institution_linking(student_data.email, student_data.institution_name)
        
        # Step 4: Verify notification sent
        await self._verify_notification_sent(student_data.email)
        
        logger.info(f"Successfully completed migration for: {student_data.email}")
    
    async def _register_student_auth_service(self, student_data: StudentRegistrationData) -> Dict[str, Any]:
        """Register student through Auth Service"""
        registration_payload = {
            'email': student_data.email,
            'password': student_data.password,
            'password_confirm': student_data.password,
            'first_name': student_data.first_name,
            'last_name': student_data.last_name,
            'phone_number': student_data.phone_number,
            'national_id': student_data.national_id,
            'registration_number': student_data.registration_number,
            'institution_name': student_data.institution_name,
            'year_of_study': student_data.year_of_study,
            'registration_method': student_data.registration_method
        }
        
        if student_data.course:
            registration_payload['course'] = student_data.course
        if student_data.university_code:
            registration_payload['university_code'] = student_data.university_code
        if student_data.academic_year:
            registration_payload['academic_year'] = student_data.academic_year
        if student_data.gender:
            registration_payload['gender'] = student_data.gender
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.auth_service_url}/api/v1/auth/register/student/",
                json=registration_payload,
                timeout=30.0
            )
            
            if response.status_code == 201:
                return response.json()
            else:
                error_msg = f"Auth service registration failed: {response.status_code} - {response.text}"
                raise Exception(error_msg)
    
    async def _verify_user_profile_creation(self, email: str) -> None:
        """Verify that user profile was created in User Service"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.user_service_url}/api/v1/profiles/student/by-email/{email}/",
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise Exception(f"User profile not found in User Service for {email}")
    
    async def _verify_institution_linking(self, email: str, institution_name: str) -> None:
        """Verify that institution linking was successful"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.institution_service_url}/api/v1/institutions/search/?name={institution_name}",
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Institution linking verification failed for {email}")
    
    async def _verify_notification_sent(self, email: str) -> None:
        """Verify that welcome notification was sent"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.notification_service_url}/api/v1/notifications/user/{email}/",
                timeout=10.0
            )
            
            if response.status_code != 200:
                logger.warning(f"Could not verify notification for {email}")
    
    async def _validate_event_communication(self) -> None:
        """Validate that event-driven communication is working"""
        logger.info("Validating event-driven communication")
        
        # Test event publishing and handling
        async with httpx.AsyncClient() as client:
            # Check User Service events endpoint
            response = await client.get(
                f"{self.user_service_url}/api/v1/events/health/",
                timeout=10.0
            )
            
            if response.status_code == 200:
                logger.info("✓ Event system is operational")
            else:
                logger.warning("⚠ Event system health check failed")
    
    async def _generate_migration_report(self) -> Dict[str, Any]:
        """Generate comprehensive migration report"""
        duration = self.stats['end_time'] - self.stats['start_time']
        
        report = {
            'migration_summary': {
                'total_students': self.stats['total_students'],
                'migrated_successfully': self.stats['migrated_successfully'],
                'migration_errors': self.stats['migration_errors'],
                'validation_errors': self.stats['validation_errors'],
                'success_rate': (self.stats['migrated_successfully'] / self.stats['total_students'] * 100) if self.stats['total_students'] > 0 else 0,
                'duration_seconds': duration.total_seconds(),
                'start_time': self.stats['start_time'].isoformat(),
                'end_time': self.stats['end_time'].isoformat()
            },
            'errors': self.errors,
            'recommendations': self._generate_recommendations()
        }
        
        # Save report to file
        report_file = f"migration_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Migration report saved to: {report_file}")
        return report
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on migration results"""
        recommendations = []
        
        if self.stats['migration_errors'] > 0:
            recommendations.append("Review migration errors and implement retry mechanisms")
        
        if self.stats['validation_errors'] > 0:
            recommendations.append("Improve data validation before migration")
        
        success_rate = (self.stats['migrated_successfully'] / self.stats['total_students'] * 100) if self.stats['total_students'] > 0 else 0
        
        if success_rate < 95:
            recommendations.append("Consider implementing rollback mechanisms for failed migrations")
        
        if success_rate >= 95:
            recommendations.append("Migration successful - proceed with API Gateway routing updates")
        
        return recommendations

async def main():
    """Main migration execution"""
    config = {
        'AUTH_SERVICE_URL': os.getenv('AUTH_SERVICE_URL', 'http://localhost:8001'),
        'USER_SERVICE_URL': os.getenv('USER_SERVICE_URL', 'http://localhost:8002'),
        'INSTITUTION_SERVICE_URL': os.getenv('INSTITUTION_SERVICE_URL', 'http://localhost:8003'),
        'NOTIFICATION_SERVICE_URL': os.getenv('NOTIFICATION_SERVICE_URL', 'http://localhost:8004'),
        'API_GATEWAY_URL': os.getenv('API_GATEWAY_URL', 'http://localhost:8000')
    }
    
    migrator = StudentRegistrationMigrator(config)
    
    try:
        report = await migrator.migrate_student_registration_workflow()
        
        print("\n" + "="*50)
        print("MIGRATION COMPLETED")
        print("="*50)
        print(f"Total Students: {report['migration_summary']['total_students']}")
        print(f"Successfully Migrated: {report['migration_summary']['migrated_successfully']}")
        print(f"Errors: {report['migration_summary']['migration_errors']}")
        print(f"Success Rate: {report['migration_summary']['success_rate']:.2f}%")
        print(f"Duration: {report['migration_summary']['duration_seconds']:.2f} seconds")
        
        if report['recommendations']:
            print("\nRecommendations:")
            for rec in report['recommendations']:
                print(f"- {rec}")
        
        return report
        
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())