-- SQL Server compatible version of user_service_schema.sql
-- This file contains SQL Server specific syntax and data types
-- For PostgreSQL version, see user_service_schema.sql

-- Note: SQL Server doesn't support extensions like PostgreSQL
-- UUID functionality is handled differently in SQL Server

-- Create schema (SQL Server syntax)
CREATE SCHEMA user_service;
GO

-- Set default schema
USE [YourDatabaseName]; -- Replace with your actual database name
GO

-- User profiles table
CREATE TABLE user_service.profiles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(), -- SQL Server UUID equivalent
    user_id UNIQUEIDENTIFIER NOT NULL UNIQUE, -- References auth_service.users.id
    profile_type NVARCHAR(20) NOT NULL CHECK (profile_type IN ('student', 'company', 'institution')),
    display_name NVARCHAR(255),
    bio NVARCHAR(MAX),
    avatar_url NVARCHAR(500),
    cover_image_url NVARCHAR(500),
    location NVARCHAR(255),
    website_url NVARCHAR(500),
    linkedin_url NVARCHAR(500),
    twitter_url NVARCHAR(500),
    github_url NVARCHAR(500),
    phone_number NVARCHAR(20),
    date_of_birth DATE,
    gender NVARCHAR(20),
    nationality NVARCHAR(100),
    timezone NVARCHAR(50) DEFAULT 'UTC',
    language_preference NVARCHAR(10) DEFAULT 'en',
    privacy_level NVARCHAR(20) DEFAULT 'public' CHECK (privacy_level IN ('public', 'private', 'friends')),
    is_verified BIT NOT NULL DEFAULT 0,
    verification_documents NVARCHAR(MAX), -- JSON stored as text in SQL Server
    metadata NVARCHAR(MAX), -- JSON stored as text in SQL Server
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Student profiles table
CREATE TABLE user_service.student_profiles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    profile_id UNIQUEIDENTIFIER NOT NULL UNIQUE,
    student_id NVARCHAR(50),
    institution_name NVARCHAR(255),
    institution_id UNIQUEIDENTIFIER,
    degree_level NVARCHAR(50) CHECK (degree_level IN ('bachelor', 'master', 'phd', 'diploma', 'certificate')),
    field_of_study NVARCHAR(255),
    graduation_year INT,
    current_year INT,
    gpa DECIMAL(3,2),
    skills NVARCHAR(MAX), -- JSON array stored as text
    interests NVARCHAR(MAX), -- JSON array stored as text
    languages NVARCHAR(MAX), -- JSON array stored as text
    certifications NVARCHAR(MAX), -- JSON array stored as text
    achievements NVARCHAR(MAX), -- JSON array stored as text
    extracurricular_activities NVARCHAR(MAX),
    work_experience NVARCHAR(MAX),
    projects NVARCHAR(MAX),
    preferred_locations NVARCHAR(MAX), -- JSON array stored as text
    job_preferences NVARCHAR(MAX),
    salary_expectation NVARCHAR(MAX), -- JSON stored as text
    availability_date DATE,
    is_seeking_internship BIT NOT NULL DEFAULT 0,
    is_seeking_job BIT NOT NULL DEFAULT 0,
    resume_url NVARCHAR(500),
    portfolio_url NVARCHAR(500),
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (profile_id) REFERENCES user_service.profiles(id) ON DELETE CASCADE
);
GO

-- Company profiles table
CREATE TABLE user_service.company_profiles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    profile_id UNIQUEIDENTIFIER NOT NULL UNIQUE,
    company_name NVARCHAR(255) NOT NULL,
    company_size NVARCHAR(50) CHECK (company_size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    industry NVARCHAR(255),
    founded_year INT,
    headquarters_location NVARCHAR(255),
    company_description NVARCHAR(MAX),
    mission_statement NVARCHAR(MAX),
    [values] NVARCHAR(MAX), -- JSON array stored as text
    benefits NVARCHAR(MAX), -- JSON array stored as text
    technologies NVARCHAR(MAX), -- JSON array stored as text
    locations NVARCHAR(MAX), -- JSON array stored as text
    employee_count INT,
    annual_revenue DECIMAL(15,2),
    stock_symbol NVARCHAR(10),
    company_culture NVARCHAR(MAX), -- JSON stored as text
    work_environment NVARCHAR(50) CHECK (work_environment IN ('remote', 'hybrid', 'onsite')),
    social_media NVARCHAR(MAX), -- JSON stored as text
    logo_url NVARCHAR(500),
    banner_url NVARCHAR(500),
    careers_page_url NVARCHAR(500),
    is_hiring BIT NOT NULL DEFAULT 0,
    is_verified BIT NOT NULL DEFAULT 0,
    verification_documents NVARCHAR(MAX), -- JSON stored as text
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (profile_id) REFERENCES user_service.profiles(id) ON DELETE CASCADE
);
GO

-- Institution profiles table
CREATE TABLE user_service.institution_profiles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    profile_id UNIQUEIDENTIFIER NOT NULL UNIQUE,
    institution_name NVARCHAR(255) NOT NULL,
    institution_type NVARCHAR(50) CHECK (institution_type IN ('university', 'college', 'school', 'training_center')),
    accreditation NVARCHAR(255),
    established_year INT,
    student_count INT,
    faculty_count INT,
    campus_locations NVARCHAR(MAX), -- JSON array stored as text
    programs_offered NVARCHAR(MAX), -- JSON array stored as text
    ranking_national INT,
    ranking_international INT,
    tuition_fees DECIMAL(10,2),
    application_deadline DATE,
    admission_requirements NVARCHAR(MAX),
    contact_email NVARCHAR(254),
    contact_phone NVARCHAR(20),
    admissions_email NVARCHAR(254),
    is_verified BIT NOT NULL DEFAULT 0,
    verification_documents NVARCHAR(MAX), -- JSON stored as text
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (profile_id) REFERENCES user_service.profiles(id) ON DELETE CASCADE
);
GO

-- User roles table
CREATE TABLE user_service.roles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(MAX),
    permissions NVARCHAR(MAX), -- JSON array stored as text
    scope NVARCHAR(MAX), -- JSON stored as text
    is_system_role BIT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- User role assignments
CREATE TABLE user_service.user_roles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL, -- References auth_service.users.id
    role_id UNIQUEIDENTIFIER NOT NULL,
    assigned_by UNIQUEIDENTIFIER, -- References auth_service.users.id
    assigned_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    expires_at DATETIME2,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (role_id) REFERENCES user_service.roles(id) ON DELETE CASCADE,
    UNIQUE (user_id, role_id)
);
GO

-- User connections/relationships
CREATE TABLE user_service.connections (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    requester_id UNIQUEIDENTIFIER NOT NULL, -- References auth_service.users.id
    addressee_id UNIQUEIDENTIFIER NOT NULL, -- References auth_service.users.id
    status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    connection_type NVARCHAR(50) DEFAULT 'professional' CHECK (connection_type IN ('professional', 'academic', 'personal')),
    message NVARCHAR(MAX),
    requested_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    responded_at DATETIME2,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CHECK (requester_id != addressee_id),
    UNIQUE (requester_id, addressee_id)
);
GO

-- User activities/timeline
CREATE TABLE user_service.activities (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL, -- References auth_service.users.id
    activity_type NVARCHAR(50) NOT NULL,
    title NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    metadata NVARCHAR(MAX), -- JSON stored as text
    visibility NVARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'connections', 'private')),
    is_pinned BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- User preferences
CREATE TABLE user_service.preferences (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL UNIQUE, -- References auth_service.users.id
    email_notifications NVARCHAR(MAX), -- JSON stored as text
    push_notifications NVARCHAR(MAX), -- JSON stored as text
    privacy_settings NVARCHAR(MAX), -- JSON stored as text
    communication_preferences NVARCHAR(MAX), -- JSON stored as text
    job_preferences NVARCHAR(MAX), -- JSON stored as text
    recruitment_preferences NVARCHAR(MAX), -- JSON stored as text
    display_preferences NVARCHAR(MAX), -- JSON stored as text
    accessibility_settings NVARCHAR(MAX), -- JSON stored as text
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- User sessions (for tracking active sessions)
CREATE TABLE user_service.user_sessions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL, -- References auth_service.users.id
    session_token NVARCHAR(255) NOT NULL UNIQUE,
    ip_address NVARCHAR(45), -- IPv6 compatible
    user_agent NVARCHAR(MAX),
    device_info NVARCHAR(MAX),
    location_info NVARCHAR(255),
    is_active BIT NOT NULL DEFAULT 1,
    last_activity DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Create indexes for better performance
CREATE INDEX IX_profiles_user_id ON user_service.profiles(user_id);
CREATE INDEX IX_profiles_profile_type ON user_service.profiles(profile_type);
CREATE INDEX IX_profiles_is_verified ON user_service.profiles(is_verified);
CREATE INDEX IX_student_profiles_institution_id ON user_service.student_profiles(institution_id);
CREATE INDEX IX_student_profiles_graduation_year ON user_service.student_profiles(graduation_year);
CREATE INDEX IX_student_profiles_is_seeking_internship ON user_service.student_profiles(is_seeking_internship);
CREATE INDEX IX_student_profiles_is_seeking_job ON user_service.student_profiles(is_seeking_job);
CREATE INDEX IX_company_profiles_company_size ON user_service.company_profiles(company_size);
CREATE INDEX IX_company_profiles_industry ON user_service.company_profiles(industry);
CREATE INDEX IX_company_profiles_is_hiring ON user_service.company_profiles(is_hiring);
CREATE INDEX IX_company_profiles_is_verified ON user_service.company_profiles(is_verified);
CREATE INDEX IX_institution_profiles_institution_type ON user_service.institution_profiles(institution_type);
CREATE INDEX IX_user_roles_user_id ON user_service.user_roles(user_id);
CREATE INDEX IX_user_roles_role_id ON user_service.user_roles(role_id);
CREATE INDEX IX_user_roles_is_active ON user_service.user_roles(is_active);
CREATE INDEX IX_connections_requester_id ON user_service.connections(requester_id);
CREATE INDEX IX_connections_addressee_id ON user_service.connections(addressee_id);
CREATE INDEX IX_connections_status ON user_service.connections(status);
CREATE INDEX IX_activities_user_id ON user_service.activities(user_id);
CREATE INDEX IX_activities_activity_type ON user_service.activities(activity_type);
CREATE INDEX IX_activities_created_at ON user_service.activities(created_at);
CREATE INDEX IX_user_sessions_user_id ON user_service.user_sessions(user_id);
CREATE INDEX IX_user_sessions_session_token ON user_service.user_sessions(session_token);
CREATE INDEX IX_user_sessions_is_active ON user_service.user_sessions(is_active);
CREATE INDEX IX_user_sessions_expires_at ON user_service.user_sessions(expires_at);
GO

-- Create triggers for updated_at columns (SQL Server syntax)
GO
CREATE TRIGGER TR_profiles_updated_at ON user_service.profiles
AFTER UPDATE AS
BEGIN
    UPDATE user_service.profiles 
    SET updated_at = GETUTCDATE() 
    FROM user_service.profiles p
    INNER JOIN inserted i ON p.id = i.id;
END;
GO

CREATE TRIGGER TR_student_profiles_updated_at ON user_service.student_profiles
AFTER UPDATE AS
BEGIN
    UPDATE user_service.student_profiles 
    SET updated_at = GETUTCDATE() 
    FROM user_service.student_profiles sp
    INNER JOIN inserted i ON sp.id = i.id;
END;
GO

CREATE TRIGGER TR_company_profiles_updated_at ON user_service.company_profiles
AFTER UPDATE AS
BEGIN
    UPDATE user_service.company_profiles 
    SET updated_at = GETUTCDATE() 
    FROM user_service.company_profiles cp
    INNER JOIN inserted i ON cp.id = i.id;
END;
GO

CREATE TRIGGER TR_institution_profiles_updated_at ON user_service.institution_profiles
AFTER UPDATE AS
BEGIN
    UPDATE user_service.institution_profiles 
    SET updated_at = GETUTCDATE() 
    FROM user_service.institution_profiles ip
    INNER JOIN inserted i ON ip.id = i.id;
END;
GO

CREATE TRIGGER TR_roles_updated_at ON user_service.roles
AFTER UPDATE AS
BEGIN
    UPDATE user_service.roles 
    SET updated_at = GETUTCDATE() 
    FROM user_service.roles r
    INNER JOIN inserted i ON r.id = i.id;
END;
GO

CREATE TRIGGER TR_user_roles_updated_at ON user_service.user_roles
AFTER UPDATE AS
BEGIN
    UPDATE user_service.user_roles 
    SET updated_at = GETUTCDATE() 
    FROM user_service.user_roles ur
    INNER JOIN inserted i ON ur.id = i.id;
END;
GO

CREATE TRIGGER TR_connections_updated_at ON user_service.connections
AFTER UPDATE AS
BEGIN
    UPDATE user_service.connections 
    SET updated_at = GETUTCDATE() 
    FROM user_service.connections c
    INNER JOIN inserted i ON c.id = i.id;
END;
GO

CREATE TRIGGER TR_activities_updated_at ON user_service.activities
AFTER UPDATE AS
BEGIN
    UPDATE user_service.activities 
    SET updated_at = GETUTCDATE() 
    FROM user_service.activities a
    INNER JOIN inserted i ON a.id = i.id;
END;
GO

CREATE TRIGGER TR_preferences_updated_at ON user_service.preferences
AFTER UPDATE AS
BEGIN
    UPDATE user_service.preferences 
    SET updated_at = GETUTCDATE() 
    FROM user_service.preferences p
    INNER JOIN inserted i ON p.id = i.id;
END;
GO

CREATE TRIGGER TR_user_sessions_updated_at ON user_service.user_sessions
AFTER UPDATE AS
BEGIN
    UPDATE user_service.user_sessions 
    SET updated_at = GETUTCDATE() 
    FROM user_service.user_sessions us
    INNER JOIN inserted i ON us.id = i.id;
END;
GO

-- Insert default roles
INSERT INTO user_service.roles (name, description, permissions, is_system_role) VALUES
('Student', 'Default role for students', '["view_profile", "edit_own_profile", "connect_users", "view_jobs", "apply_jobs"]', 1),
('Company_Admin', 'Administrator role for companies', '["manage_company_profile", "post_jobs", "view_applications", "manage_employees", "view_analytics"]', 1),
('Institution_Admin', 'Administrator role for institutions', '["manage_institution_profile", "manage_students", "view_analytics", "manage_programs"]', 1),
('Recruiter', 'Role for company recruiters', '["view_profiles", "contact_students", "post_jobs", "view_applications"]', 1),
('Career_Counselor', 'Role for career counselors', '["view_student_profiles", "provide_guidance", "view_job_market"]', 1),
('System_Admin', 'System administrator role', '["manage_all_users", "manage_system", "view_all_data", "manage_roles"]', 1);
GO

-- Create views for common queries
GO
CREATE VIEW user_service.student_profiles_view AS
SELECT 
    p.id as profile_id,
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.location,
    p.is_verified as profile_verified,
    sp.student_id,
    sp.institution_name,
    sp.degree_level,
    sp.field_of_study,
    sp.graduation_year,
    sp.current_year,
    sp.gpa,
    sp.is_seeking_internship,
    sp.is_seeking_job,
    sp.availability_date,
    sp.resume_url,
    sp.portfolio_url
FROM user_service.profiles p
INNER JOIN user_service.student_profiles sp ON p.id = sp.profile_id
WHERE p.profile_type = 'student';
GO

CREATE VIEW user_service.company_profiles_view AS
SELECT 
    p.id as profile_id,
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.location,
    p.website_url,
    p.is_verified as profile_verified,
    cp.company_name,
    cp.company_size,
    cp.industry,
    cp.founded_year,
    cp.headquarters_location,
    cp.employee_count,
    cp.work_environment,
    cp.is_hiring,
    cp.is_verified as company_verified,
    cp.careers_page_url
FROM user_service.profiles p
INNER JOIN user_service.company_profiles cp ON p.id = cp.profile_id
WHERE p.profile_type = 'company';
GO

CREATE VIEW user_service.institution_profiles_view AS
SELECT 
    p.id as profile_id,
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.location,
    p.website_url,
    p.is_verified as profile_verified,
    ip.institution_name,
    ip.institution_type,
    ip.accreditation,
    ip.established_year,
    ip.student_count,
    ip.faculty_count,
    ip.ranking_national,
    ip.ranking_international,
    ip.contact_email,
    ip.admissions_email,
    ip.is_verified as institution_verified
FROM user_service.profiles p
INNER JOIN user_service.institution_profiles ip ON p.id = ip.profile_id
WHERE p.profile_type = 'institution';
GO

CREATE VIEW user_service.user_connections_view AS
SELECT 
    c.id as connection_id,
    c.requester_id,
    c.addressee_id,
    c.status,
    c.connection_type,
    c.requested_at,
    c.responded_at,
    p1.display_name as requester_name,
    p1.avatar_url as requester_avatar,
    p2.display_name as addressee_name,
    p2.avatar_url as addressee_avatar
FROM user_service.connections c
LEFT JOIN user_service.profiles p1 ON c.requester_id = p1.user_id
LEFT JOIN user_service.profiles p2 ON c.addressee_id = p2.user_id;
GO

-- Create stored procedures for common operations
CREATE PROCEDURE user_service.get_user_profile
    @user_id UNIQUEIDENTIFIER
AS
BEGIN
    SELECT 
        p.*,
        CASE 
            WHEN p.profile_type = 'student' THEN 'student_profile'
            WHEN p.profile_type = 'company' THEN 'company_profile'
            WHEN p.profile_type = 'institution' THEN 'institution_profile'
            ELSE 'basic_profile'
        END as profile_category
    FROM user_service.profiles p
    WHERE p.user_id = @user_id;
    
    -- Return specific profile data based on type
    IF EXISTS (SELECT 1 FROM user_service.profiles WHERE user_id = @user_id AND profile_type = 'student')
    BEGIN
        SELECT sp.* FROM user_service.student_profiles sp
        INNER JOIN user_service.profiles p ON sp.profile_id = p.id
        WHERE p.user_id = @user_id;
    END
    ELSE IF EXISTS (SELECT 1 FROM user_service.profiles WHERE user_id = @user_id AND profile_type = 'company')
    BEGIN
        SELECT cp.* FROM user_service.company_profiles cp
        INNER JOIN user_service.profiles p ON cp.profile_id = p.id
        WHERE p.user_id = @user_id;
    END
    ELSE IF EXISTS (SELECT 1 FROM user_service.profiles WHERE user_id = @user_id AND profile_type = 'institution')
    BEGIN
        SELECT ip.* FROM user_service.institution_profiles ip
        INNER JOIN user_service.profiles p ON ip.profile_id = p.id
        WHERE p.user_id = @user_id;
    END
END;
GO

CREATE PROCEDURE user_service.get_user_roles
    @user_id UNIQUEIDENTIFIER
AS
BEGIN
    SELECT 
        r.id,
        r.name,
        r.description,
        r.permissions,
        r.scope,
        ur.assigned_at,
        ur.expires_at,
        ur.is_active
    FROM user_service.user_roles ur
    INNER JOIN user_service.roles r ON ur.role_id = r.id
    WHERE ur.user_id = @user_id 
    AND ur.is_active = 1 
    AND (ur.expires_at IS NULL OR ur.expires_at > GETUTCDATE())
    AND r.is_active = 1;
END;
GO

CREATE PROCEDURE user_service.cleanup_expired_sessions
AS
BEGIN
    -- Mark expired sessions as inactive
    UPDATE user_service.user_sessions 
    SET is_active = 0
    WHERE expires_at < GETUTCDATE() AND is_active = 1;
    
    -- Delete old inactive sessions (keep last 30 days)
    DELETE FROM user_service.user_sessions 
    WHERE is_active = 0 AND created_at < DATEADD(day, -30, GETUTCDATE());
    
    -- Clean up old activities (keep last 365 days)
    DELETE FROM user_service.activities 
    WHERE created_at < DATEADD(day, -365, GETUTCDATE()) AND is_pinned = 0;
END;
GO

-- Note: For production use, consider setting up SQL Server Agent jobs
-- to run the cleanup procedure periodically
-- Example: EXEC msdb.dbo.sp_add_job to schedule user_service.cleanup_expired_sessions