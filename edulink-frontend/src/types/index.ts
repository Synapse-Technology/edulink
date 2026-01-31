// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'employer' | 'institution' | 'admin' | 'institution_admin' | 'employer_admin' | 'supervisor' | 'system_admin';
  trustLevel?: number;
  trustPoints?: number;
  avatar?: string;
  institution_id?: string;
  employer_id?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  academicYear: string;
  gender: string;
  dateOfBirth: string;
  phoneNumber: string;
  university: string;
  course: string;
  department: string;
  skills: string[];
  bio?: string;
  resume?: string;
  transcript?: string;
  profilePicture?: string;
}

export interface EmployerProfile {
  id: string;
  userId: string;
  companyName: string;
  industry: string;
  companySize: string;
  website?: string;
  description?: string;
  logo?: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
}

export interface InstitutionProfile {
  id: string;
  userId: string;
  institutionName: string;
  institutionType: string;
  location: string;
  website?: string;
  description?: string;
  logo?: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'employer' | 'institution';
  inviteCode?: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Internship types
export interface Internship {
  id: string;
  title: string;
  description: string;
  company: string;
  location: string;
  duration: string;
  stipend?: number;
  applicationDeadline: string;
  requirements: string[];
  skills: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  internshipId: string;
  studentId: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  coverLetter?: string;
  resume: string;
  appliedAt: string;
  updatedAt: string;
}

// Dashboard types
export interface DashboardStats {
  totalInternships: number;
  totalApplications: number;
  activeApplications: number;
  completedInternships: number;
  recentActivity: Activity[];
}

export interface Activity {
  id: string;
  type: 'application' | 'internship' | 'message';
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'file';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: Record<string, any>;
}

// Navigation types
export interface NavItem {
  name: string;
  href: string;
  icon?: string;
  current?: boolean;
  children?: NavItem[];
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}