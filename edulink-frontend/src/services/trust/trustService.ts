import { apiClient as client } from '../api/client';

export type TrustLevel = 0 | 1 | 2 | 3 | 4;
export type EntityType = 'student' | 'employer' | 'institution';

export interface TrustRequirement {
  label: string;
  completed: boolean;
  description: string;
  missing?: string[];
  [key: string]: unknown;
}

export interface TrustTierRequirement {
  level: TrustLevel;
  name: string;
  label: string;
  description: string;
  requirement_key: string;
  completed: boolean;
  requirement: TrustRequirement;
}

export interface StudentTrustState {
  student_id: string;
  score: number;
  event_score?: number;
  tier_level: TrustLevel;
  tier_name: string;
  tier_label: string;
  current_level: TrustLevel;
  current_label: string;
  next_level: TrustLevel | null;
  progress_percentage: number;
  requirements: TrustTierRequirement[];
  requirement_status: Record<string, TrustRequirement>;
}

export const trustLabels: Record<EntityType, Record<number, string>> = {
  student: {
    0: 'Self-Registered',
    1: 'Documents Uploaded',
    2: 'Institution Verified',
    3: 'Internship Completed',
    4: 'Completion Certified',
  },
  employer: {
    0: 'Unverified',
    1: 'Verified Entity',
    2: 'Active Host',
    3: 'Trusted Partner',
    4: 'Strategic Partner',
  },
  institution: {
    0: 'Registered',
    1: 'Active',
    2: 'High Trust',
    3: 'Strategic Partner',
    4: 'Strategic Partner',
  },
};

export const normalizeTrustLevel = (level?: number | null): TrustLevel => {
  const numeric = Number.isFinite(level) ? Number(level) : 0;
  return Math.min(4, Math.max(0, Math.floor(numeric))) as TrustLevel;
};

export const getTrustLabel = (entityType: EntityType, level?: number | null): string => {
  const safeLevel = normalizeTrustLevel(level);
  return trustLabels[entityType][safeLevel] || 'Unknown';
};

class TrustService {
  async getStudentTrustState(studentId: string): Promise<StudentTrustState> {
    const response = await client.get<{ trust_tier: StudentTrustState }>(`/api/students/${studentId}/trust_tier/`);
    return response.trust_tier;
  }
}

export const trustService = new TrustService();
export default trustService;
