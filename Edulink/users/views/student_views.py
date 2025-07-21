# users/views/student_views.py

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.models.student_profile import StudentProfile
from users.serializers.student_serializer import StudentProfileSerializer


class StudentProfileDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        profile = getattr(self.request.user, 'student_profile', None)
        return profile

    def get(self, request, *args, **kwargs):
        profile = self.get_object()
        if profile:
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        return Response(
            {"detail": "Student profile not found. Please complete your profile."},
            status=status.HTTP_404_NOT_FOUND
        )

    def put(self, request, *args, **kwargs):
        profile = self.get_object()
        
        # Check if profile exists
        if not profile:
            return Response(
                {"detail": "Student profile not found. Please complete your profile."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Filter out empty values from request data
        update_data = {}
        for key, value in request.data.items():
            if value is not None and value != '':
                # Handle JSON fields properly
                if key in ['skills', 'interests']:
                    try:
                        if isinstance(value, str):
                            # If it's a string, try to parse as JSON
                            import json
                            parsed_value = json.loads(value)
                            if isinstance(parsed_value, list):
                                update_data[key] = parsed_value
                        elif isinstance(value, list):
                            update_data[key] = value
                    except (json.JSONDecodeError, TypeError):
                        # If JSON parsing fails, skip this field
                        continue
                else:
                    update_data[key] = value
        
        # Only validate required fields if they're being updated
        required_fields = ['first_name', 'last_name', 'phone_number', 'national_id', 
                          'registration_number', 'academic_year']
        incomplete_fields = []
        
        for field in required_fields:
            if field in update_data and not update_data[field]:
                incomplete_fields.append(field)
        
        # Update profile with filtered data
        serializer = self.get_serializer(profile, data=update_data, partial=True)
        
        if serializer.is_valid():
            serializer.save(user=request.user)
            
            # Return response with incomplete fields info if any
            response_data = serializer.data
            if incomplete_fields:
                response_data['incomplete_fields'] = incomplete_fields
                response_data['profile_complete'] = False
            else:
                response_data['profile_complete'] = True
                response_data['incomplete_fields'] = []
            
            return Response(response_data)
        else:
            return Response(
                {"detail": "Invalid data provided", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
