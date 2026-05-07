export { apiClient } from './api/client';
export { authService } from './auth/authService';
export { adminAuthService } from './auth/adminAuthService';
export { institutionService } from './institution/institutionService';
export { ledgerService } from './ledger/ledgerService';
export { trustService } from './trust/trustService';
export * from './errors';
export * from './trust/trustService';

// Re-export types
export type { 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  TokenRefreshResponse, 
  UserProfile 
} from './auth/authService';

export type { 
  AdminUser, 
  AdminLoginCredentials, 
  AdminAuthResponse, 
  AdminTokenRefreshResponse, 
  CreateAdminUserData, 
  UpdateAdminUserData, 
  AdminDashboardStats 
} from './auth/adminAuthService';
