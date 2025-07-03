from rest_framework import serializers

class RecentApplicationSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    internship_title = serializers.CharField()
    status = serializers.CharField()
    applied_on = serializers.DateTimeField()

class StudentDashboardSerializer(serializers.Serializer):
    total_applications = serializers.IntegerField()
    application_status_counts = serializers.DictField(child=serializers.IntegerField())
    recent_applications = RecentApplicationSerializer(many=True)
    unread_notifications = serializers.IntegerField()
    profile_complete = serializers.BooleanField()
    incomplete_fields = serializers.ListField(child=serializers.CharField())
