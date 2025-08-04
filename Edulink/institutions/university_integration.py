from django.db import models
from django.core.exceptions import ValidationError
from .models import Institution, Course, Department, Campus, UniversityAPIConfig, StudentVerificationLog
import requests
import json
from typing import Dict, Any, Optional
from django.conf import settings


class UniversitySystemIntegrator:
    """Service class for integrating with university systems"""
    
    def __init__(self, institution: Institution):
        self.institution = institution
        self.api_config = getattr(institution, 'api_config', None)
    
    def verify_student(self, registration_number: str) -> Dict[str, Any]:
        """
        Verify student with university system and return student data
        
        Returns:
            Dict containing:
            - verified: bool
            - student_data: dict (if verified)
            - error: str (if not verified)
        """
        if not self.api_config or not self.api_config.is_active:
            return {
                'verified': False,
                'error': 'University API integration not configured or inactive'
            }
        
        try:
            # Prepare API request
            endpoint = self.api_config.api_endpoint.rstrip('/') + self.api_config.student_lookup_endpoint.format(
                registration_number=registration_number
            )
            
            headers = self._get_auth_headers()
            
            # Make API request
            import time
            start_time = time.time()
            response = requests.get(endpoint, headers=headers, timeout=30)
            response_time = int((time.time() - start_time) * 1000)
            
            # Log the verification attempt
            log_data = {
                'registration_number': registration_number,
                'institution': self.institution,
                'response_time_ms': response_time
            }
            
            if response.status_code == 200:
                student_data = response.json()
                log_data.update({
                    'verification_status': 'success',
                    'api_response': student_data
                })
                StudentVerificationLog.objects.create(**log_data)
                
                return {
                    'verified': True,
                    'student_data': self._normalize_student_data(student_data)
                }
            
            elif response.status_code == 404:
                log_data.update({
                    'verification_status': 'not_found',
                    'error_message': 'Student not found in university system'
                })
                StudentVerificationLog.objects.create(**log_data)
                
                return {
                    'verified': False,
                    'error': 'Student not found in university system'
                }
            
            else:
                log_data.update({
                    'verification_status': 'api_error',
                    'error_message': f'API returned status {response.status_code}'
                })
                StudentVerificationLog.objects.create(**log_data)
                
                return {
                    'verified': False,
                    'error': f'University system error (Status: {response.status_code})'
                }
        
        except requests.exceptions.Timeout:
            StudentVerificationLog.objects.create(
                registration_number=registration_number,
                institution=self.institution,
                verification_status='timeout',
                error_message='API request timed out'
            )
            return {
                'verified': False,
                'error': 'University system timeout'
            }
        
        except Exception as e:
            StudentVerificationLog.objects.create(
                registration_number=registration_number,
                institution=self.institution,
                verification_status='api_error',
                error_message=str(e)
            )
            return {
                'verified': False,
                'error': f'Integration error: {str(e)}'
            }
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers based on auth type"""
        headers = {'Content-Type': 'application/json'}
        
        if self.api_config.auth_type == 'api_key':
            headers['X-API-Key'] = self.api_config.api_key
        elif self.api_config.auth_type == 'bearer':
            headers['Authorization'] = f'Bearer {self.api_config.api_key}'
        elif self.api_config.auth_type == 'basic':
            import base64
            credentials = base64.b64encode(f'{self.api_config.api_key}:{self.api_config.api_secret}'.encode()).decode()
            headers['Authorization'] = f'Basic {credentials}'
        
        return headers
    
    def _normalize_student_data(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize student data from university API to our expected format
        
        Expected university API response format:
        {
            "registration_number": "CS/2021/001",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@student.university.edu",
            "course": {
                "name": "Computer Science",
                "code": "CS",
                "duration_years": 4
            },
            "department": {
                "name": "Computer Science Department",
                "code": "CS"
            },
            "campus": {
                "name": "Main Campus",
                "code": "MAIN"
            },
            "year_of_study": 3,
            "academic_year": 2024,
            "status": "active",
            "admission_date": "2021-09-01"
        }
        """
        normalized = {
            'registration_number': raw_data.get('registration_number'),
            'first_name': raw_data.get('first_name'),
            'last_name': raw_data.get('last_name'),
            'email': raw_data.get('email'),
            'year_of_study': raw_data.get('year_of_study'),
            'academic_year': raw_data.get('academic_year'),
            'status': raw_data.get('status', 'active'),
            'admission_date': raw_data.get('admission_date')
        }
        
        # Extract course information
        if 'course' in raw_data:
            normalized['course'] = {
                'name': raw_data['course'].get('name'),
                'code': raw_data['course'].get('code'),
                'duration_years': raw_data['course'].get('duration_years')
            }
        
        # Extract department information
        if 'department' in raw_data:
            normalized['department'] = {
                'name': raw_data['department'].get('name'),
                'code': raw_data['department'].get('code')
            }
        
        # Extract campus information
        if 'campus' in raw_data:
            normalized['campus'] = {
                'name': raw_data['campus'].get('name'),
                'code': raw_data['campus'].get('code')
            }
        
        return normalized
    
    def sync_student_data(self, registration_number: str) -> Optional[Dict[str, Any]]:
        """
        Sync and update student data from university system
        """
        verification_result = self.verify_student(registration_number)
        
        if verification_result['verified']:
            student_data = verification_result['student_data']
            
            # Create or update course if provided
            if 'course' in student_data and student_data['course']:
                course_data = student_data['course']
                course, created = Course.objects.get_or_create(
                    institution=self.institution,
                    code=course_data.get('code', ''),
                    defaults={
                        'name': course_data.get('name', ''),
                        'duration_years': course_data.get('duration_years')
                    }
                )
                student_data['course_obj'] = course
            
            # Create or update department if provided
            if 'department' in student_data and student_data['department']:
                dept_data = student_data['department']
                department, created = Department.objects.get_or_create(
                    institution=self.institution,
                    code=dept_data.get('code', ''),
                    defaults={
                        'name': dept_data.get('name', '')
                    }
                )
                student_data['department_obj'] = department
            
            # Create or update campus if provided
            if 'campus' in student_data and student_data['campus']:
                campus_data = student_data['campus']
                campus, created = Campus.objects.get_or_create(
                    institution=self.institution,
                    code=campus_data.get('code', ''),
                    defaults={
                        'name': campus_data.get('name', ''),
                        'address': '',  # Will need to be provided by API
                        'city': '',     # Will need to be provided by API
                    }
                )
                student_data['campus_obj'] = campus
            
            return student_data
        
        return None