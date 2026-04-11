/**
 * Type definitions for Internship-related data structures
 * Single source of truth for all internship-related types
 */

export interface SupervisorDetails {
  id: string;
  name: string;
  email: string;
  role: 'EMPLOYER_SUPERVISOR' | 'INSTITUTION_SUPERVISOR';
}

export interface EmployerDetails {
  id: string;
  name: string;
  logo?: string;
  email: string;
  website?: string;
}

export interface Internship {
  id: string;
  title: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CERTIFIED' | 'TERMINATED';
  description: string;
  location: string;
  arrangement: 'FULL_TIME' | 'PART_TIME' | 'REMOTE' | 'HYBRID';
  department?: string;
  created_at: string;
  start_date: string;
  end_date?: string;
  logbook_count: number;

  // Employer information
  employer_details?: EmployerDetails;
  employer_supervisor_details?: SupervisorDetails;
  employer_supervisor_id?: string;

  // Institution information
  institution_supervisor_details?: SupervisorDetails;
  institution_supervisor_id?: string;
}

export interface InternshipApplication {
  id: string;
  internship_id?: string;
  internship?: Internship;
  student_id: string;
  student_name?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  created_at: string;
  updated_at: string;
}
