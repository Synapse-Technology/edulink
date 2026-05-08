from rest_framework import serializers
from .models import Artifact, ArtifactType

class ArtifactSerializer(serializers.ModelSerializer):
    artifact_type_display = serializers.SerializerMethodField()
    download_filename = serializers.SerializerMethodField()
    
    class Meta:
        model = Artifact
        fields = [
            'id', 
            'application_id', 
            'student_id', 
            'artifact_type', 
            'artifact_type_display',
            'file', 
            'metadata', 
            'generated_by', 
            'created_at',
            'tracking_code',
            'download_filename'
        ]
        read_only_fields = ['id', 'file', 'created_at', 'tracking_code', 'download_filename']

    def get_download_filename(self, obj):
        """
        Returns a human-readable filename for the artifact.
        """
        student_name = obj.metadata.get('student_name', 'Student').replace(' ', '_')
        type_label = self.get_artifact_type_display(obj).replace(' ', '_')
        code = obj.tracking_code or str(obj.id)[:8]
        return f"Edulink_{type_label}_{student_name}_{code}.pdf"

    def get_artifact_type_display(self, obj):
        if obj.artifact_type == ArtifactType.LOGBOOK_REPORT:
            return "Attachment Logbook Report"
        return obj.get_artifact_type_display()
