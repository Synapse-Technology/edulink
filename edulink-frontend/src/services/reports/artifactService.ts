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
  status?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  error_message?: string;
  completed_at?: string;
}

export interface ArtifactStatus {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  completed_at: string | null;
  error_message: string | null;
  artifact_type: string;
}

export interface VerificationResult {
  verified: boolean;
  artifact_type?: string;
  student_name?: string;
  generated_at?: string;
  tracking_code?: string;
  ledger_hash?: string;
  ledger_timestamp?: string;
  error?: string;
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

  async getArtifactStatus(artifactId: string): Promise<ArtifactStatus> {
    try {
      const response = await this.client.get<ArtifactStatus>(
        `/api/reports/artifacts/status/${artifactId}`
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to get artifact status');
    }
  }

  async pollArtifactStatus(
    artifactId: string,
    maxAttempts: number = 60,
    intervalMs: number = 1000
  ): Promise<ArtifactStatus> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const status = await this.getArtifactStatus(artifactId);
        
        if (status.status === 'SUCCESS' || status.status === 'FAILED') {
          return status;
        }
        
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        attempts++;
      } catch (error) {
        console.error('Error polling artifact status:', error);
        throw error;
      }
    }
    
    throw new Error('Artifact generation timeout - please refresh to check status');
  }

  async verifyArtifact(artifactId: string): Promise<VerificationResult> {
    try {
      const response = await this.client.get<VerificationResult>(
        `/api/reports/artifacts/verify/${artifactId}`,
        { skipAuth: true } // Allow unauthenticated verification
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          verified: false,
          error: error.message
        };
      }
      return {
        verified: false,
        error: 'Failed to verify artifact'
      };
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

  getVerificationLink(artifactId: string): string {
    // Generate a shareable verification link
    const baseUrl = window.location.origin;
    return `${baseUrl}/verify-artifact/${artifactId}`;
  }

  getDownloadLink(artifactId: string): string {
    // Generate download link (requires authentication)
    return `/api/reports/artifacts/${artifactId}/download/`;
  }
}

export const artifactService = new ArtifactService();
