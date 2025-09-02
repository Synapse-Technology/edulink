from users.models import SystemSetting
from rest_framework import serializers
from rest_framework.views import APIView

class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = '__all__' 