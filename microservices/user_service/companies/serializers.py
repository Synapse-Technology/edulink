from rest_framework import serializers
from .models import Company, Department, CompanySettings, Supervisor
from profiles.models import EmployerProfile


class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model."""
    
    employee_count = serializers.SerializerMethodField()
    department_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'description', 'website', 'logo',
            'industry', 'company_size', 'founded_year',
            'headquarters_location', 'company_type',
            'is_verified', 'is_active', 'created_at', 'updated_at',
            'employee_count', 'department_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_verified']
    
    def get_employee_count(self, obj):
        """Get the number of employees in the company."""
        return obj.employees.filter(employment_status='active').count()
    
    def get_department_count(self, obj):
        """Get the number of departments in the company."""
        return obj.departments.filter(is_active=True).count()


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for Department model."""
    
    company_name = serializers.CharField(source='company.name', read_only=True)
    employee_count = serializers.SerializerMethodField()
    department_head_name = serializers.CharField(source='department_head.user.get_full_name', read_only=True)
    
    class Meta:
        model = Department
        fields = [
            'id', 'company', 'company_name', 'name', 'description',
            'department_head', 'department_head_name', 'is_active',
            'created_at', 'updated_at', 'employee_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_employee_count(self, obj):
        """Get the number of employees in the department."""
        return obj.employees.filter(employment_status='active').count()


class CompanySettingsSerializer(serializers.ModelSerializer):
    """Serializer for CompanySettings model."""
    
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = CompanySettings
        fields = [
            'id', 'company', 'company_name', 'allow_public_profile',
            'require_approval_for_posts', 'auto_approve_employees',
            'notification_preferences', 'privacy_settings',
            'branding_settings', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SupervisorSerializer(serializers.ModelSerializer):
    """Serializer for Supervisor model."""
    
    # supervisor_name = serializers.CharField(source='supervisor.user.get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    company_name = serializers.CharField(source='department.company.name', read_only=True)
    
    class Meta:
        model = Supervisor
        fields = [
            'id', 'department',  # Temporarily removed supervisor, supervisor_name
            'department_name', 'company_name', 'supervisor_level',
            'can_approve_requests', 'can_manage_employees',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CompanyDetailSerializer(CompanySerializer):
    """Detailed serializer for Company with nested data."""
    
    departments = DepartmentSerializer(many=True, read_only=True)
    settings = CompanySettingsSerializer(read_only=True)
    
    class Meta(CompanySerializer.Meta):
        fields = CompanySerializer.Meta.fields + ['departments', 'settings']


class DepartmentDetailSerializer(DepartmentSerializer):
    """Detailed serializer for Department with nested data."""
    
    supervisors = SupervisorSerializer(many=True, read_only=True)
    employees = serializers.SerializerMethodField()
    
    class Meta(DepartmentSerializer.Meta):
        fields = DepartmentSerializer.Meta.fields + ['supervisors', 'employees']
    
    def get_employees(self, obj):
        """Get basic employee information for the department."""
        from profiles.serializers import EmployerProfileBasicSerializer
        employees = obj.employees.filter(employment_status='active')
        return EmployerProfileBasicSerializer(employees, many=True).data


class CompanyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new company."""
    
    class Meta:
        model = Company
        fields = [
            'name', 'description', 'website', 'logo',
            'industry', 'company_size', 'founded_year',
            'headquarters_location', 'company_type'
        ]
    
    def create(self, validated_data):
        """Create a new company with default settings."""
        company = Company.objects.create(**validated_data)
        
        # Create default company settings
        CompanySettings.objects.create(
            company=company,
            allow_public_profile=True,
            require_approval_for_posts=False,
            auto_approve_employees=False,
            notification_preferences={"email": True, "sms": False},
            privacy_settings={"public_employee_list": False},
            branding_settings={"primary_color": "#007bff", "logo_url": ""}
        )
        
        # Create a default "General" department
        Department.objects.create(
            company=company,
            name="General",
            description="Default department",
            is_active=True
        )
        
        return company