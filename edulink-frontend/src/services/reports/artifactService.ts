import { apiClient } from '../api/client';
import { ApiError } from '../errors';

export interface Artifact {
  id: string;
  application_id: string;
  student_id: string;
  artifact_type: 'CERTIFICATE' | 'LOGBOOK_REPORT' | 'PERFORMANCE_SUMMARY';
  artifact_type_display: string;
  file: string;
  metadata: any;
  generated_by: string;
  created_at: string;
  tracking_code: string;
  download_filename: string;
}

class ArtifactService {
  private client = apiClient;

  async getArtifacts(): Promise<Artifact[]> {
    try {
      const response = await this.client.get<Artifact[]>('/api/reports/artifacts/');
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch artifacts');
    }
  }

  async getArtifact(id: string): Promise<Artifact> {
    try {
      const response = await this.client.get<Artifact>(`/api/reports/artifacts/${id}/`);
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to fetch artifact details');
    }
  }

  async generateArtifact(applicationId: string, artifactType: string): Promise<Artifact> {
    try {
      const response = await this.client.post<Artifact>('/api/reports/artifacts/generate/', {
        application_id: applicationId,
        artifact_type: artifactType
      });
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to generate artifact');
    }
  }

  async downloadArtifact(artifact: Artifact): Promise<void> {
    try {
      const response = await this.client.get(`/api/reports/artifacts/${artifact.id}/download/`, {
        responseType: 'blob'
      });
      
      // Create a blob URL and trigger download
      const blob = new Blob([response as any], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', artifact.download_filename || `artifact_${artifact.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to download artifact');
    }
  }
}

export const artifactService = new ArtifactService();
