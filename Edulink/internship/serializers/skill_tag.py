from rest_framework import serializers
from ..models.skill_tag import SkillTag

class SkillTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillTag
        fields = '__all__' 