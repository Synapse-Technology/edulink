-- SQL Server compatible version of auth_service_schema.sql
-- This file contains SQL Server specific syntax and data types
-- For PostgreSQL version, see auth_service_schema.sql

-- Note: SQL Server doesn't support extensions like PostgreSQL
-- UUID functionality is handled differently in SQL Server

-- Create schema (SQL Server syntax)
CREATE SCHEMA auth_service;
GO

-- Set default schema
USE [YourDatabaseName]; -- Replace with your actual database name
GO

-- Users table
CREATE TABLE auth_service.users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(), -- SQL Server UUID equivalent
    username NVARCHAR(150) NOT NULL UNIQUE,
    email NVARCHAR(254) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    first_name NVARCHAR(150),
    last_name NVARCHAR(150),
    is_active BIT NOT NULL DEFAULT 1,
    is_staff BIT NOT NULL DEFAULT 0,
    is_superuser BIT NOT NULL DEFAULT 0,
    date_joined DATETIME2 NOT NULL DEFAULT GETUTCDATE(), -- SQL Server timestamp
    last_login DATETIME2,
    email_verified BIT NOT NULL DEFAULT 0,
    phone_number NVARCHAR(20),
    two_factor_enabled BIT NOT NULL DEFAULT 0,
    two_factor_secret NVARCHAR(255),
    backup_codes NVARCHAR(MAX), -- JSON stored as text in SQL Server
    password_reset_token NVARCHAR(255),
    password_reset_expires DATETIME2,
    email_verification_token NVARCHAR(255),
    email_verification_expires DATETIME2,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    account_locked_until DATETIME2,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Permissions table
CREATE TABLE auth_service.permissions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL UNIQUE,
    codename NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(MAX),
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- User permissions junction table
CREATE TABLE auth_service.user_permissions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    permission_id UNIQUEIDENTIFIER NOT NULL,
    granted_by UNIQUEIDENTIFIER,
    granted_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    expires_at DATETIME2,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (user_id) REFERENCES auth_service.users(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES auth_service.permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES auth_service.users(id),
    UNIQUE (user_id, permission_id)
);

-- Groups table
CREATE TABLE auth_service.groups (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(150) NOT NULL UNIQUE,
    description NVARCHAR(MAX),
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Group permissions junction table
CREATE TABLE auth_service.group_permissions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    group_id UNIQUEIDENTIFIER NOT NULL,
    permission_id UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (group_id) REFERENCES auth_service.groups(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES auth_service.permissions(id) ON DELETE CASCADE,
    UNIQUE (group_id, permission_id)
);

-- User groups junction table
CREATE TABLE auth_service.user_groups (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    group_id UNIQUEIDENTIFIER NOT NULL,
    added_by UNIQUEIDENTIFIER,
    added_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (user_id) REFERENCES auth_service.users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES auth_service.groups(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES auth_service.users(id),
    UNIQUE (user_id, group_id)
);

-- Login attempts tracking
CREATE TABLE auth_service.login_attempts (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER,
    ip_address NVARCHAR(45), -- IPv6 compatible
    user_agent NVARCHAR(MAX),
    success BIT NOT NULL,
    failure_reason NVARCHAR(255),
    attempted_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (user_id) REFERENCES auth_service.users(id) ON DELETE SET NULL
);

-- Password history
CREATE TABLE auth_service.password_history (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (user_id) REFERENCES auth_service.users(id) ON DELETE CASCADE
);

-- OAuth providers
CREATE TABLE auth_service.oauth_providers (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(100) NOT NULL UNIQUE,
    client_id NVARCHAR(255) NOT NULL,
    client_secret NVARCHAR(255) NOT NULL,
    authorization_url NVARCHAR(500) NOT NULL,
    token_url NVARCHAR(500) NOT NULL,
    user_info_url NVARCHAR(500) NOT NULL,
    scope NVARCHAR(255),
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- OAuth accounts
CREATE TABLE auth_service.oauth_accounts (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    provider_id UNIQUEIDENTIFIER NOT NULL,
    provider_user_id NVARCHAR(255) NOT NULL,
    access_token NVARCHAR(MAX),
    refresh_token NVARCHAR(MAX),
    expires_at DATETIME2,
    scope NVARCHAR(255),
    token_type NVARCHAR(50),
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (user_id) REFERENCES auth_service.users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES auth_service.oauth_providers(id) ON DELETE CASCADE,
    UNIQUE (provider_id, provider_user_id)
);

-- API keys
CREATE TABLE auth_service.api_keys (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(255) NOT NULL,
    key_hash NVARCHAR(255) NOT NULL UNIQUE,
    permissions NVARCHAR(MAX), -- JSON array stored as text
    is_active BIT NOT NULL DEFAULT 1,
    expires_at DATETIME2,
    last_used_at DATETIME2,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (user_id) REFERENCES auth_service.users(id) ON DELETE CASCADE
);

-- Audit log
CREATE TABLE auth_service.audit_log (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER,
    action NVARCHAR(100) NOT NULL,
    resource_type NVARCHAR(100),
    resource_id NVARCHAR(255),
    ip_address NVARCHAR(45),
    user_agent NVARCHAR(MAX),
    details NVARCHAR(MAX), -- JSON stored as text
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (user_id) REFERENCES auth_service.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IX_users_email ON auth_service.users(email);
CREATE INDEX IX_users_username ON auth_service.users(username);
CREATE INDEX IX_users_is_active ON auth_service.users(is_active);
CREATE INDEX IX_user_permissions_user_id ON auth_service.user_permissions(user_id);
CREATE INDEX IX_user_permissions_permission_id ON auth_service.user_permissions(permission_id);
CREATE INDEX IX_user_groups_user_id ON auth_service.user_groups(user_id);
CREATE INDEX IX_user_groups_group_id ON auth_service.user_groups(group_id);
CREATE INDEX IX_login_attempts_user_id ON auth_service.login_attempts(user_id);
CREATE INDEX IX_login_attempts_ip_address ON auth_service.login_attempts(ip_address);
CREATE INDEX IX_login_attempts_attempted_at ON auth_service.login_attempts(attempted_at);
CREATE INDEX IX_audit_log_user_id ON auth_service.audit_log(user_id);
CREATE INDEX IX_audit_log_action ON auth_service.audit_log(action);
CREATE INDEX IX_audit_log_created_at ON auth_service.audit_log(created_at);

-- Create triggers for updated_at columns (SQL Server syntax)
GO
CREATE TRIGGER TR_users_updated_at ON auth_service.users
AFTER UPDATE AS
BEGIN
    UPDATE auth_service.users 
    SET updated_at = GETUTCDATE() 
    FROM auth_service.users u
    INNER JOIN inserted i ON u.id = i.id;
END;
GO

CREATE TRIGGER TR_permissions_updated_at ON auth_service.permissions
AFTER UPDATE AS
BEGIN
    UPDATE auth_service.permissions 
    SET updated_at = GETUTCDATE() 
    FROM auth_service.permissions p
    INNER JOIN inserted i ON p.id = i.id;
END;
GO

-- Insert default permissions
INSERT INTO auth_service.permissions (name, codename, description) VALUES
('Can add user', 'add_user', 'Permission to create new users'),
('Can change user', 'change_user', 'Permission to modify existing users'),
('Can delete user', 'delete_user', 'Permission to delete users'),
('Can view user', 'view_user', 'Permission to view user details'),
('Can add group', 'add_group', 'Permission to create new groups'),
('Can change group', 'change_group', 'Permission to modify existing groups'),
('Can delete group', 'delete_group', 'Permission to delete groups'),
('Can view group', 'view_group', 'Permission to view group details'),
('Can manage permissions', 'manage_permissions', 'Permission to assign/revoke permissions'),
('Can view audit log', 'view_audit_log', 'Permission to view audit logs'),
('Can manage api keys', 'manage_api_keys', 'Permission to create/manage API keys'),
('Can impersonate user', 'impersonate_user', 'Permission to impersonate other users');

-- Insert default groups
INSERT INTO auth_service.groups (name, description) VALUES
('Administrators', 'Full system access'),
('Staff', 'Staff members with limited admin access'),
('Users', 'Regular users'),
('API Users', 'Users with API access');

-- Insert default OAuth providers (examples)
INSERT INTO auth_service.oauth_providers (name, client_id, client_secret, authorization_url, token_url, user_info_url, scope) VALUES
('Google', 'your-google-client-id', 'your-google-client-secret', 
 'https://accounts.google.com/o/oauth2/auth', 
 'https://oauth2.googleapis.com/token', 
 'https://www.googleapis.com/oauth2/v2/userinfo', 
 'openid email profile'),
('GitHub', 'your-github-client-id', 'your-github-client-secret', 
 'https://github.com/login/oauth/authorize', 
 'https://github.com/login/oauth/access_token', 
 'https://api.github.com/user', 
 'user:email'),
('Microsoft', 'your-microsoft-client-id', 'your-microsoft-client-secret', 
 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', 
 'https://login.microsoftonline.com/common/oauth2/v2.0/token', 
 'https://graph.microsoft.com/v1.0/me', 
 'openid email profile');

-- Create views for common queries
GO
CREATE VIEW auth_service.user_permissions_view AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    p.name as permission_name,
    p.codename as permission_codename,
    'direct' as permission_source,
    up.granted_at,
    up.expires_at
FROM auth_service.users u
INNER JOIN auth_service.user_permissions up ON u.id = up.user_id
INNER JOIN auth_service.permissions p ON up.permission_id = p.id
WHERE u.is_active = 1 AND (up.expires_at IS NULL OR up.expires_at > GETUTCDATE())

UNION ALL

SELECT 
    u.id as user_id,
    u.username,
    u.email,
    p.name as permission_name,
    p.codename as permission_codename,
    'group' as permission_source,
    ug.added_at as granted_at,
    NULL as expires_at
FROM auth_service.users u
INNER JOIN auth_service.user_groups ug ON u.id = ug.user_id
INNER JOIN auth_service.groups g ON ug.group_id = g.id
INNER JOIN auth_service.group_permissions gp ON g.id = gp.group_id
INNER JOIN auth_service.permissions p ON gp.permission_id = p.id
WHERE u.is_active = 1 AND g.is_active = 1;
GO

CREATE VIEW auth_service.active_sessions_view AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    u.last_login,
    CASE WHEN u.last_login > DATEADD(hour, -24, GETUTCDATE()) THEN 1 ELSE 0 END as is_recently_active
FROM auth_service.users u
WHERE u.is_active = 1 AND u.last_login IS NOT NULL;
GO

-- Create stored procedures for common operations
CREATE PROCEDURE auth_service.user_has_permission
    @user_id UNIQUEIDENTIFIER,
    @permission_codename NVARCHAR(100)
AS
BEGIN
    DECLARE @has_permission BIT = 0;
    
    -- Check direct permissions
    IF EXISTS (
        SELECT 1 FROM auth_service.user_permissions up
        INNER JOIN auth_service.permissions p ON up.permission_id = p.id
        WHERE up.user_id = @user_id 
        AND p.codename = @permission_codename
        AND (up.expires_at IS NULL OR up.expires_at > GETUTCDATE())
    )
    BEGIN
        SET @has_permission = 1;
    END
    
    -- Check group permissions
    IF @has_permission = 0 AND EXISTS (
        SELECT 1 FROM auth_service.user_groups ug
        INNER JOIN auth_service.groups g ON ug.group_id = g.id
        INNER JOIN auth_service.group_permissions gp ON g.id = gp.group_id
        INNER JOIN auth_service.permissions p ON gp.permission_id = p.id
        WHERE ug.user_id = @user_id 
        AND p.codename = @permission_codename
        AND g.is_active = 1
    )
    BEGIN
        SET @has_permission = 1;
    END
    
    SELECT @has_permission as has_permission;
END;
GO

-- Create procedure for cleanup
CREATE PROCEDURE auth_service.cleanup_expired_data
AS
BEGIN
    -- Clean up expired password reset tokens
    UPDATE auth_service.users 
    SET password_reset_token = NULL, password_reset_expires = NULL
    WHERE password_reset_expires < GETUTCDATE();
    
    -- Clean up expired email verification tokens
    UPDATE auth_service.users 
    SET email_verification_token = NULL, email_verification_expires = NULL
    WHERE email_verification_expires < GETUTCDATE();
    
    -- Clean up old login attempts (keep last 30 days)
    DELETE FROM auth_service.login_attempts 
    WHERE attempted_at < DATEADD(day, -30, GETUTCDATE());
    
    -- Clean up old audit logs (keep last 90 days)
    DELETE FROM auth_service.audit_log 
    WHERE created_at < DATEADD(day, -90, GETUTCDATE());
    
    -- Clean up expired user permissions
    DELETE FROM auth_service.user_permissions 
    WHERE expires_at < GETUTCDATE();
END;
GO

-- Note: For production use, consider setting up SQL Server Agent jobs
-- to run the cleanup procedure periodically
-- Example: EXEC msdb.dbo.sp_add_job to schedule auth_service.cleanup_expired_data