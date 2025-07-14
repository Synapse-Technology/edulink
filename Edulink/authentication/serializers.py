from rest_framework import serializers
from .models import User, Invite, EmailOTP
from django.contrib.auth import authenticate, get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, smart_str, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from django.conf import settings
from users.models import UserRole, StudentProfile, InstitutionProfile, EmployerProfile
from institutions.models import Institution
from django.utils import timezone
from django.db import transaction
import random
from users.roles import RoleChoices


def validate_unique_email(value):
    if not value:
        return
    if User.objects.filter(email=value).exists():  # type: ignore[attr-defined]
        raise serializers.ValidationError("A user with this email already exists.")


def validate_unique_phone_number(value):
    if not value:
        return
    if (
        StudentProfile.objects.filter(phone_number=value).exists()  # type: ignore[attr-defined]
        or InstitutionProfile.objects.filter(phone_number=value).exists()  # type: ignore[attr-defined]
        or EmployerProfile.objects.filter(phone_number=value).exists()  # type: ignore[attr-defined]
    ):
        raise serializers.ValidationError(
            "A user with this phone number already exists."
        )


class BaseProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(
        max_length=20, validators=[validate_unique_phone_number]
    )
    email = serializers.EmailField(validators=[validate_unique_email])
    password = serializers.CharField(write_only=True, validators=[validate_password])


class StudentRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField(validators=[validate_unique_email])
    password = serializers.CharField(write_only=True, validators=[validate_password])
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(
        max_length=20, validators=[validate_unique_phone_number]
    )
    national_id = serializers.CharField(max_length=20)
    registration_number = serializers.CharField(max_length=50)
    academic_year = serializers.IntegerField()
    institution_name = serializers.CharField(max_length=255)
    course_code = serializers.CharField(max_length=50, required=False)

    def validate(self, data):
        # Validate institution exists and is verified
        try:
            institution = Institution.objects.get(name=data["institution_name"])  # type: ignore[attr-defined]
            if not institution.is_verified:
                raise serializers.ValidationError(
                    "The specified institution is not verified yet."
                )
            data["institution"] = institution
        except Institution.DoesNotExist:  # type: ignore[attr-defined]
            raise serializers.ValidationError(
                "The specified institution does not exist."
            )

        # Validate course if provided
        if "course_code" in data:
            try:
                course = institution.courses.get(code=data["course_code"])  # type: ignore[attr-defined]
                data["course"] = course
            except Exception:  # type: ignore[attr-defined]
                raise serializers.ValidationError(
                    "Invalid course code for the specified institution."
                )

        # Validate unique fields
        if StudentProfile.objects.filter(national_id=data["national_id"]).exists():  # type: ignore[attr-defined]
            raise serializers.ValidationError(
                "A student with this national ID already exists."
            )

        # type: ignore[attr-defined]
        if StudentProfile.objects.filter(
            registration_number=data["registration_number"]
        ).exists():
            raise serializers.ValidationError(
                "A student with this registration number already exists."
            )

        return data

    @transaction.atomic
    def create(self, validated_data):
        # Extract profile data
        academic_year = validated_data.pop("academic_year")
        phone_number = validated_data.pop("phone_number")
        national_id = validated_data.pop("national_id")
        institution = validated_data.pop("institution")
        
        profile_data = {
            "first_name": validated_data.pop("first_name"),
            "last_name": validated_data.pop("last_name"),
            "phone_number": phone_number,
            "national_id": national_id,
            "registration_number": validated_data.pop("registration_number"),
            "academic_year": academic_year,
            "institution": institution,
            "course": validated_data.get("course"),
            "year_of_study": academic_year,
            "institution_name": institution.name,
            # Set verification status based on institution verification
            "is_verified": institution.is_verified,
        }

        # Create user with role and additional fields
        user = User.objects.create_user(  # type: ignore[attr-defined]
            email=validated_data["email"],
            password=validated_data["password"],
            role="student",  # Set the role directly on the user
            phone_number=phone_number,
            national_id=national_id,
            institution=institution,  # FIX: assign the Institution instance, not institution.name
            is_email_verified=True,  # Set to True since we're creating the user
        )

        # Create StudentProfile
        student_profile = StudentProfile.objects.create(  # type: ignore[attr-defined]
            user=user, **profile_data
        )

        # Create welcome notification
        from notifications.models import Notification

        Notification.objects.create(  # type: ignore[attr-defined]
            user=user,
            message=f"Welcome to EduLink KE, {student_profile.first_name}! We're excited to have you.",
            notification_type="email",
            status="pending",
        )
        # Send email verification
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verify_url = f"http://localhost:8000/api/auth/verify-email/{uid}/{token}/"
        send_mail(
            "Verify your EduLink account",
            f"Hi {student_profile.first_name},\n\nPlease verify your email by clicking the link below:\n{verify_url}\n\nThank you for joining EduLink!",
            settings.DEFAULT_FROM_EMAIL,
            [user.email],  # type: ignore[attr-defined]
            fail_silently=False,
        )
        return user


class InstitutionRegistrationSerializer(BaseProfileSerializer):
    institution_name = serializers.CharField(max_length=255)
    institution_type = serializers.CharField(max_length=100)
    registration_number = serializers.CharField(max_length=100)
    address = serializers.CharField(max_length=255)
    website = serializers.URLField(required=False)
    position = serializers.CharField(max_length=100, required=False)
    national_id = serializers.CharField(max_length=20)

    @transaction.atomic
    def create(self, validated_data):
        # Extract profile data
        phone_number = validated_data.pop("phone_number", None)
        if not phone_number:
            raise serializers.ValidationError(
                {"phone_number": "Phone number is required."}
            )
        profile_data = {
            "first_name": validated_data.pop("first_name"),
            "last_name": validated_data.pop("last_name"),
            "phone_number": phone_number,
            "position": validated_data.pop("position", None),
        }

        # Create user with correct role
        user = User.objects.create_user(  # type: ignore[attr-defined]
            email=validated_data["email"],
            password=validated_data["password"],
            role="institution_admin",  # Set the correct role
            national_id=validated_data.pop("national_id"),  # Save national_id to user
        )

        # Create Institution
        institution = Institution.objects.create(  # type: ignore[attr-defined]
            name=validated_data["institution_name"],
            institution_type=validated_data["institution_type"],
            registration_number=validated_data["registration_number"],
            email=validated_data["email"],
            phone_number=phone_number,
            address=validated_data["address"],
            website=validated_data.get("website"),
        )

        # Create UserRole
        UserRole.objects.create(  # type: ignore[attr-defined]
            user=user, role="institution_admin", institution=institution
        )

        # Create InstitutionProfile
        institution_profile = InstitutionProfile.objects.create(  # type: ignore[attr-defined]
            user=user, institution=institution, **profile_data
        )

        # Create welcome notification
        from notifications.models import Notification

        Notification.objects.create(  # type: ignore[attr-defined]
            user=user,
            message=f"Welcome to EduLink KE, {institution_profile.first_name}! We're excited to have you.",
            notification_type="email",
            status="pending",
        )
        # Send email verification
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verify_url = f"http://localhost:8000/api/auth/verify-email/{uid}/{token}/"
        send_mail(
            "Verify your EduLink account",
            f"Hi {institution_profile.first_name},\n\nPlease verify your email by clicking the link below:\n{verify_url}\n\nThank you for joining EduLink!",
            settings.DEFAULT_FROM_EMAIL,
            [user.email],  # type: ignore[attr-defined]
            fail_silently=False,
        )
        return user


class EmployerRegistrationSerializer(BaseProfileSerializer):
    company_name = serializers.CharField(max_length=255)
    industry = serializers.CharField(max_length=100)
    company_size = serializers.CharField(max_length=50)
    location = serializers.CharField(max_length=255)
    website = serializers.URLField(required=False)
    department = serializers.CharField(max_length=100, required=False)
    position = serializers.CharField(max_length=100, required=False)
    national_id = serializers.CharField(max_length=20)

    @transaction.atomic
    def create(self, validated_data):
        # Extract profile data
        phone_number = validated_data.pop("phone_number", None)
        if not phone_number:
            raise serializers.ValidationError(
                {"phone_number": "Phone number is required."}
            )
        profile_data = {
            "first_name": validated_data.pop("first_name"),
            "last_name": validated_data.pop("last_name"),
            "phone_number": phone_number,
            "position": validated_data.pop("position", None),
        }

        # Create user with correct role
        user = User.objects.create_user(  # type: ignore[attr-defined]
            email=validated_data["email"],
            password=validated_data["password"],
            role="employer",  # Set the correct role
            national_id=validated_data.pop("national_id"),  # Save national_id to user
        )

        # Create EmployerProfile
        employer_profile = EmployerProfile.objects.create(  # type: ignore[attr-defined]
            user=user,
            company_name=validated_data["company_name"],
            industry=validated_data["industry"],
            company_size=validated_data["company_size"],
            location=validated_data["location"],
            website=validated_data.get("website"),
            department=validated_data.get("department"),
            **profile_data,
        )

        # Create UserRole
        UserRole.objects.create(  # type: ignore[attr-defined]
            user=user, role="employer"
        )

        # Create welcome notification
        from notifications.models import Notification

        Notification.objects.create(  # type: ignore[attr-defined]
            user=user,
            message=f"Welcome to EduLink KE, {employer_profile.first_name}! We're excited to have you.",
            notification_type="email",
            status="pending",
        )
        # Send email verification
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verify_url = f"http://localhost:8000/api/auth/verify-email/{uid}/{token}/"
        send_mail(
            "Verify your EduLink account",
            f"Hi {employer_profile.first_name},\n\nPlease verify your email by clicking the link below:\n{verify_url}\n\nThank you for joining EduLink!",
            settings.DEFAULT_FROM_EMAIL,
            [user.email],  # type: ignore[attr-defined]
            fail_silently=False,
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(email=data["email"], password=data["password"])
        if not user:
            raise serializers.ValidationError(
                "No active account found with the given credentials"
            )

        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated")

        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        if user.role == RoleChoices.STUDENT:  # type: ignore[attr-defined]
            try:
                student_profile = user.student_profile  # type: ignore[attr-defined]
                student_profile.last_login_at = timezone.now()
                student_profile.save(update_fields=["last_login_at"])
                
                # Check if student profile is verified (this is the institution verification)
                if not student_profile.is_verified:
                    raise serializers.ValidationError(
                        "Your institution is not yet verified. Please contact your institution administrator."
                    )
            except StudentProfile.DoesNotExist:  # type: ignore[attr-defined]
                # If no student profile exists, that's a data integrity issue
                raise serializers.ValidationError(
                    "Student profile not found. Please contact support."
                )

        return data

    def _get_profile_data(self, user):
        try:
            if user.role == RoleChoices.STUDENT:  # type: ignore[attr-defined]
                profile = user.student_profile  # type: ignore[attr-defined]
            elif user.role == RoleChoices.INSTITUTION_ADMIN:  # type: ignore[attr-defined]
                profile = user.institution_profile  # type: ignore[attr-defined]
            elif user.role == RoleChoices.EMPLOYER:  # type: ignore[attr-defined]
                profile = user.employer_profile  # type: ignore[attr-defined]
            else:
                profile = None

            if profile:
                return {
                    "first_name": profile.first_name,
                    "last_name": profile.last_name,
                }
        except (
            AttributeError,
            StudentProfile.DoesNotExist,  # type: ignore[attr-defined]
            InstitutionProfile.DoesNotExist,  # type: ignore[attr-defined]
            EmployerProfile.DoesNotExist,  # type: ignore[attr-defined]
        ):
            pass
        return {"first_name": None, "last_name": None}


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        # Authenticate the user first
        user = authenticate(email=attrs['email'], password=attrs['password'])
        if not user:
            raise serializers.ValidationError(
                "No active account found with the given credentials"
            )
            
        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated")
            
        # Check if email is verified
        if not user.is_email_verified:  # type: ignore[attr-defined]
            raise serializers.ValidationError(
                "Please verify your email address before logging in. Check your email for a verification link."
            )
        
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        
        if user.role == RoleChoices.STUDENT:  # type: ignore[attr-defined]
            try:
                student_profile = user.student_profile  # type: ignore[attr-defined]
                student_profile.last_login_at = timezone.now()
                student_profile.save(update_fields=["last_login_at"])
                
                # Check if student profile is verified (this is the institution verification)
                if not student_profile.is_verified:
                    raise serializers.ValidationError(
                        "Your institution is not yet verified. Please contact your institution administrator."
                    )
            except StudentProfile.DoesNotExist:  # type: ignore[attr-defined]
                # If no student profile exists, that's a data integrity issue
                raise serializers.ValidationError(
                    "Student profile not found. Please contact support."
                )

        # Get the token using the parent class method
        data = super().validate(attrs)
        
        # Add user profile data
        profile_data = self._get_profile_data(user)
        data["user"] = {"email": user.email, "role": user.role, "profile": profile_data}  # type: ignore[attr-defined]
        
        return data

    def _get_profile_data(self, user):
        try:
            if user.role == RoleChoices.STUDENT:  # type: ignore[attr-defined]
                profile = user.student_profile  # type: ignore[attr-defined]
            elif user.role == RoleChoices.INSTITUTION_ADMIN:  # type: ignore[attr-defined]
                profile = user.institution_profile  # type: ignore[attr-defined]
            elif user.role == RoleChoices.EMPLOYER:  # type: ignore[attr-defined]
                profile = user.employer_profile  # type: ignore[attr-defined]
            else:
                profile = None

            if profile:
                return {
                    "first_name": profile.first_name,
                    "last_name": profile.last_name,
                }
        except (
            AttributeError,
            StudentProfile.DoesNotExist,  # type: ignore[attr-defined]
            InstitutionProfile.DoesNotExist,  # type: ignore[attr-defined]
            EmployerProfile.DoesNotExist,  # type: ignore[attr-defined]
        ):
            pass
        return {"first_name": None, "last_name": None}


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    reset_url_template = serializers.CharField(write_only=True, required=False)

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():  # type: ignore[attr-defined]
            raise serializers.ValidationError("No user found with this email address.")
        return value

    def save(self):
        user = User.objects.get(email=self.validated_data["email"])  # type: ignore[attr-defined]
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # Use the provided template or a default from settings
        url_template = self.validated_data.get(  # type: ignore[attr-defined]
            "reset_url_template",
            getattr(
                settings,
                "PASSWORD_RESET_URL_TEMPLATE",
                "http://localhost:3000/reset-password/{uid}/{token}/",
            ),
        )
        reset_url = url_template.format(uid=uid, token=token)

        send_mail(
            subject="Password Reset Request",
            message=f"Click the following link to reset your password: {reset_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],  # type: ignore[attr-defined]
        )


class PasswordResetConfirmSerializer(serializers.Serializer):
    uidb64 = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(
        write_only=True, validators=[validate_password]
    )

    def validate(self, attrs):
        try:
            uid = force_str(urlsafe_base64_decode(attrs["uidb64"]))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError):  # type: ignore[attr-defined]
            raise serializers.ValidationError("Invalid reset link.")

        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError("Invalid or expired token.")

        self.user = user
        return attrs

    def save(self):
        self.user.set_password(self.validated_data["new_password"])  # type: ignore[index]
        self.user.save()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(
        write_only=True, validators=[validate_password]
    )

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])  # type: ignore[index]
        user.save()
        return user


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True)

    def validate(self, data):
        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError("The two password fields didn't match.")
        return data


class InviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invite
        fields = ["email", "role"]

    def validate_role(self, value):
        if value == RoleChoices.STUDENT:
            raise serializers.ValidationError(
                "Cannot invite Students. They must self-register."
            )
        return value

    def create(self, validated_data):
        invite = Invite.objects.create(**validated_data)  # type: ignore[attr-defined]
        invite_link = (
            f"http://localhost:8000/api/auth/invite-register?token={invite.token}"
        )
        send_mail(
            subject="You're invited to join EduLink KE",
            message=f"Click the following link to register: {invite_link}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invite.email],
        )
        return invite


class InvitedUserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    invite_token = serializers.UUIDField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "institution",
            "phone_number",
            "national_id",
            "invite_token",
        ]

    def validate(self, attrs):
        try:
            invite = Invite.objects.get(token=attrs["invite_token"], is_used=False)  # type: ignore[attr-defined]
        except Invite.DoesNotExist:  # type: ignore[attr-defined]
            raise serializers.ValidationError(
                {"invite_token": "Invalid or already used token."}
            )

        if invite.email.lower() != attrs["email"].lower():  # type: ignore[attr-defined, index]
            raise serializers.ValidationError({"email": "Email does not match invite."})

        if invite.role == RoleChoices.STUDENT:
            raise serializers.ValidationError(
                {"invite_token": "Students must use the public registration endpoint."}
            )

        self.context["invite"] = invite
        return attrs

    def create(self, validated_data):
        invite = self.context["invite"]
        validated_data["role"] = invite.role
        validated_data.pop("invite_token", None)
        user = User.objects.create_user(**validated_data)  # type: ignore[attr-defined]
        invite.is_used = True
        invite.save()
        return user


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    invite_token = serializers.UUIDField(required=False, write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "institution",
            "phone_number",
            "national_id",
            "invite_token",
        ]

    def validate(self, attrs):
        invite_token = attrs.get("invite_token", None)  # type: ignore[attr-defined]
        if invite_token:
            try:
                invite = Invite.objects.get(token=invite_token, is_used=False)  # type: ignore[attr-defined]
            except Invite.DoesNotExist:  # type: ignore[attr-defined]
                raise serializers.ValidationError(
                    {"invite_token": "Invalid or used invite token."}
                )

            if invite.email.lower() != attrs["email"].lower():  # type: ignore[attr-defined, index]
                raise serializers.ValidationError(
                    {"email": "Email does not match invite."}
                )

            attrs["role"] = invite.role
            self.context["invite"] = invite
        else:
            attrs["role"] = RoleChoices.STUDENT
        # FIX: convert institution from name to instance if it's a string
        institution_value = attrs.get("institution")
        if institution_value and isinstance(institution_value, str):
            try:
                institution = Institution.objects.get(name=institution_value)
                attrs["institution"] = institution
            except Institution.DoesNotExist:
                raise serializers.ValidationError({"institution": "Institution does not exist."})
        return attrs

    def create(self, validated_data):
        invite = self.context.get("invite", None)
        validated_data.pop("invite_token", None)
        user = User.objects.create_user(**validated_data)  # type: ignore[attr-defined]
        if invite:
            invite.is_used = True
            invite.save()
        return user


class TwoFALoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(email=data["email"], password=data["password"])
        if not user:
            raise serializers.ValidationError("Invalid credentials")

        otp = f"{random.randint(100000, 999999)}"
        EmailOTP.objects.create(email=data["email"], code=otp)  # type: ignore[attr-defined]

        send_mail(
            subject="Your EduLink 2FA Code",
            message=f"Your OTP is {otp}. It expires in 5 minutes.",
            from_email=None,
            recipient_list=[data["email"]],
        )

        return data


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)

    def validate(self, data):
        try:
            otp_entry = EmailOTP.objects.filter(
                email=data["email"], code=data["code"]
            ).latest(
                "created_at"
            )  # type: ignore[attr-defined]
        except EmailOTP.DoesNotExist:  # type: ignore[attr-defined]
            raise serializers.ValidationError("Invalid OTP")

        if otp_entry.is_expired():
            raise serializers.ValidationError("OTP expired")

        user = User.objects.get(email=data["email"])  # type: ignore[attr-defined]
        return {
            "refresh": str(RefreshToken.for_user(user)),
            "access": str(RefreshToken.for_user(user).access_token),  # type: ignore[attr-defined]
        }
