from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Company, Department, CompanySettings, Supervisor
from .serializers import (
    CompanySerializer, CompanyDetailSerializer, CompanyCreateSerializer,
    DepartmentSerializer, DepartmentDetailSerializer,
    CompanySettingsSerializer, SupervisorSerializer
)
from profiles.models import EmployerProfile


class CompanyViewSet(viewsets.ModelViewSet):
    """ViewSet for Company model."""
    
    queryset = Company.objects.filter(is_active=True)
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CompanyCreateSerializer
        elif self.action == 'retrieve':
            return CompanyDetailSerializer
        return CompanySerializer
    
    def get_queryset(self):
        """Filter companies based on user permissions."""
        user = self.request.user
        queryset = self.queryset
        
        # If user is an employer, they can see their own company and public companies
        try:
            employer_profile = EmployerProfile.objects.get(user=user)
            if employer_profile.company:
                queryset = queryset.filter(
                    Q(id=employer_profile.company.id) |
                    Q(settings__allow_public_profile=True)
                )
            else:
                queryset = queryset.filter(settings__allow_public_profile=True)
        except EmployerProfile.DoesNotExist:
            # Non-employer users can only see public companies
            queryset = queryset.filter(settings__allow_public_profile=True)
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def departments(self, request, pk=None):
        """Get all departments for a company."""
        company = self.get_object()
        departments = company.departments.filter(is_active=True)
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def employees(self, request, pk=None):
        """Get all employees for a company."""
        company = self.get_object()
        employees = company.employees.filter(employment_status='active')
        
        # Check if user has permission to view employee list
        try:
            employer_profile = EmployerProfile.objects.get(user=request.user)
            if employer_profile.company != company and not company.settings.privacy_settings.get('public_employee_list', False):
                return Response(
                    {'detail': 'You do not have permission to view this company\'s employee list.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except EmployerProfile.DoesNotExist:
            if not company.settings.privacy_settings.get('public_employee_list', False):
                return Response(
                    {'detail': 'Employee list is not public.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        from profiles.serializers import EmployerProfileBasicSerializer
        serializer = EmployerProfileBasicSerializer(employees, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get', 'patch'])
    def settings(self, request, pk=None):
        """Get or update company settings."""
        company = self.get_object()
        
        # Check if user has permission to manage company settings
        try:
            employer_profile = EmployerProfile.objects.get(user=request.user)
            if employer_profile.company != company or not employer_profile.can_manage_company_settings:
                return Response(
                    {'detail': 'You do not have permission to manage company settings.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except EmployerProfile.DoesNotExist:
            return Response(
                {'detail': 'You must be an employee to manage company settings.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.method == 'GET':
            serializer = CompanySettingsSerializer(company.settings)
            return Response(serializer.data)
        
        elif request.method == 'PATCH':
            serializer = CompanySettingsSerializer(
                company.settings, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DepartmentViewSet(viewsets.ModelViewSet):
    """ViewSet for Department model."""
    
    queryset = Department.objects.filter(is_active=True)
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return DepartmentDetailSerializer
        return DepartmentSerializer
    
    def get_queryset(self):
        """Filter departments based on user permissions."""
        user = self.request.user
        queryset = self.queryset
        
        # Filter by company if specified
        company_id = self.request.query_params.get('company')
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        
        # If user is an employer, they can see departments from their company
        try:
            employer_profile = EmployerProfile.objects.get(user=user)
            if employer_profile.company:
                queryset = queryset.filter(company=employer_profile.company)
        except EmployerProfile.DoesNotExist:
            # Non-employer users can only see departments from public companies
            queryset = queryset.filter(company__settings__allow_public_profile=True)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create a new department with permission check."""
        company = serializer.validated_data['company']
        
        # Check if user has permission to create departments
        try:
            employer_profile = EmployerProfile.objects.get(user=self.request.user)
            if employer_profile.company != company or not employer_profile.can_manage_departments:
                raise PermissionError('You do not have permission to create departments.')
        except EmployerProfile.DoesNotExist:
            raise PermissionError('You must be an employee to create departments.')
        
        serializer.save()
    
    @action(detail=True, methods=['get'])
    def employees(self, request, pk=None):
        """Get all employees in a department."""
        department = self.get_object()
        employees = department.employees.filter(employment_status='active')
        
        from profiles.serializers import EmployerProfileBasicSerializer
        serializer = EmployerProfileBasicSerializer(employees, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def assign_head(self, request, pk=None):
        """Assign a department head."""
        department = self.get_object()
        employee_id = request.data.get('employee_id')
        
        if not employee_id:
            return Response(
                {'detail': 'employee_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user has permission to assign department heads
        try:
            employer_profile = EmployerProfile.objects.get(user=request.user)
            if employer_profile.company != department.company or not employer_profile.can_manage_departments:
                return Response(
                    {'detail': 'You do not have permission to assign department heads.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except EmployerProfile.DoesNotExist:
            return Response(
                {'detail': 'You must be an employee to assign department heads.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            employee = EmployerProfile.objects.get(
                id=employee_id,
                company=department.company,
                employment_status='active'
            )
            department.department_head = employee
            department.save()
            
            serializer = DepartmentSerializer(department)
            return Response(serializer.data)
        
        except EmployerProfile.DoesNotExist:
            return Response(
                {'detail': 'Employee not found or not active in this company.'},
                status=status.HTTP_404_NOT_FOUND
            )


class SupervisorViewSet(viewsets.ModelViewSet):
    """ViewSet for Supervisor model."""
    
    queryset = Supervisor.objects.filter(is_active=True)
    serializer_class = SupervisorSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter supervisors based on user permissions."""
        user = self.request.user
        queryset = self.queryset
        
        # Filter by department if specified
        department_id = self.request.query_params.get('department')
        if department_id:
            queryset = queryset.filter(department_id=department_id)
        
        # If user is an employer, they can see supervisors from their company
        try:
            employer_profile = EmployerProfile.objects.get(user=user)
            if employer_profile.company:
                queryset = queryset.filter(department__company=employer_profile.company)
        except EmployerProfile.DoesNotExist:
            # Non-employer users cannot see supervisors
            queryset = queryset.none()
        
        return queryset
    
    def perform_create(self, serializer):
        """Create a new supervisor with permission check."""
        department = serializer.validated_data['department']
        
        # Check if user has permission to create supervisors
        try:
            employer_profile = EmployerProfile.objects.get(user=self.request.user)
            if employer_profile.company != department.company or not employer_profile.can_manage_employees:
                raise PermissionError('You do not have permission to create supervisors.')
        except EmployerProfile.DoesNotExist:
            raise PermissionError('You must be an employee to create supervisors.')
        
        serializer.save()
