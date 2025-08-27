-- SQL Server Schema Setup for Edulink Microservices
-- This file creates all schemas and basic structure for SQL Server
-- Note: This is an alternative to PostgreSQL setup for SQL Server environments

-- Create schemas for each microservice
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'auth_schema')
    EXEC('CREATE SCHEMA auth_schema');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'user_schema')
    EXEC('CREATE SCHEMA user_schema');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'institution_schema')
    EXEC('CREATE SCHEMA institution_schema');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'notification_schema')
    EXEC('CREATE SCHEMA notification_schema');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'application_schema')
    EXEC('CREATE SCHEMA application_schema');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'internship_schema')
    EXEC('CREATE SCHEMA internship_schema');
GO

-- Create service-specific database users (SQL Server equivalent of roles)
-- Note: These should be created by a database administrator
-- Uncomment and modify as needed for your environment

/*
-- Auth Service User
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'auth_service_user')
    CREATE USER auth_service_user WITHOUT LOGIN;

-- User Service User
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'user_service_user')
    CREATE USER user_service_user WITHOUT LOGIN;

-- Institution Service User
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'institution_service_user')
    CREATE USER institution_service_user WITHOUT LOGIN;

-- Notification Service User
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'notification_service_user')
    CREATE USER notification_service_user WITHOUT LOGIN;

-- Application Service User
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'application_service_user')
    CREATE USER application_service_user WITHOUT LOGIN;

-- Internship Service User
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'internship_service_user')
    CREATE USER internship_service_user WITHOUT LOGIN;
*/

-- Grant schema permissions
-- Auth service permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::auth_schema TO auth_service_user;
GO

-- User service permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::user_schema TO user_service_user;
GRANT SELECT ON SCHEMA::auth_schema TO user_service_user; -- Cross-schema read access
GO

-- Institution service permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::institution_schema TO institution_service_user;
GRANT SELECT ON SCHEMA::user_schema TO institution_service_user; -- Cross-schema read access
GO

-- Notification service permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::notification_schema TO notification_service_user;
GRANT SELECT ON SCHEMA::user_schema TO notification_service_user; -- Cross-schema read access
GRANT SELECT ON SCHEMA::auth_schema TO notification_service_user; -- Cross-schema read access
GO

-- Application service permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::application_schema TO application_service_user;
GRANT SELECT ON SCHEMA::user_schema TO application_service_user; -- Cross-schema read access
GRANT SELECT ON SCHEMA::institution_schema TO application_service_user; -- Cross-schema read access
GO

-- Internship service permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::internship_schema TO internship_service_user;
GRANT SELECT ON SCHEMA::institution_schema TO internship_service_user; -- Cross-schema read access
GO

-- Common functions for SQL Server
-- Note: SQL Server uses different syntax for triggers and functions

-- Function to update updated_at column (SQL Server version)
CREATE OR ALTER FUNCTION dbo.update_updated_at_column()
RETURNS TRIGGER
AS
BEGIN
    -- SQL Server trigger logic would go here
    -- This is a placeholder - actual implementation depends on specific requirements
    RETURN;
END;
GO

PRINT 'SQL Server schema setup completed successfully!';
PRINT 'Note: User creation statements are commented out and should be reviewed by DBA';
PRINT 'Note: Some PostgreSQL-specific features may need alternative implementations';