-- PostgreSQL Schema Setup for Edulink Microservices
-- This file creates all schemas and basic structure for PostgreSQL/Supabase
-- Note: This file contains PostgreSQL-specific syntax and should be executed in PostgreSQL environment

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create schemas for each microservice
CREATE SCHEMA IF NOT EXISTS auth_schema;
CREATE SCHEMA IF NOT EXISTS user_schema;
CREATE SCHEMA IF NOT EXISTS institution_schema;
CREATE SCHEMA IF NOT EXISTS notification_schema;
CREATE SCHEMA IF NOT EXISTS application_schema;
CREATE SCHEMA IF NOT EXISTS internship_schema;

-- Create service-specific database roles
DO $$
BEGIN
    -- Auth Service Role
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'auth_service_role') THEN
        CREATE ROLE auth_service_role;
    END IF;
    
    -- User Service Role
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'user_service_role') THEN
        CREATE ROLE user_service_role;
    END IF;
    
    -- Institution Service Role
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'institution_service_role') THEN
        CREATE ROLE institution_service_role;
    END IF;
    
    -- Notification Service Role
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'notification_service_role') THEN
        CREATE ROLE notification_service_role;
    END IF;
    
    -- Application Service Role
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'application_service_role') THEN
        CREATE ROLE application_service_role;
    END IF;
    
    -- Internship Service Role
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'internship_service_role') THEN
        CREATE ROLE internship_service_role;
    END IF;
END
$$;

-- Grant schema permissions
GRANT USAGE ON SCHEMA auth_schema TO auth_service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth_schema TO auth_service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth_schema TO auth_service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth_schema TO auth_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth_schema GRANT ALL ON TABLES TO auth_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth_schema GRANT ALL ON SEQUENCES TO auth_service_role;

GRANT USAGE ON SCHEMA user_schema TO user_service_role;
GRANT ALL ON ALL TABLES IN SCHEMA user_schema TO user_service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA user_schema TO user_service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA user_schema TO user_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA user_schema GRANT ALL ON TABLES TO user_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA user_schema GRANT ALL ON SEQUENCES TO user_service_role;

GRANT USAGE ON SCHEMA institution_schema TO institution_service_role;
GRANT ALL ON ALL TABLES IN SCHEMA institution_schema TO institution_service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA institution_schema TO institution_service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA institution_schema TO institution_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA institution_schema GRANT ALL ON TABLES TO institution_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA institution_schema GRANT ALL ON SEQUENCES TO institution_service_role;

GRANT USAGE ON SCHEMA notification_schema TO notification_service_role;
GRANT ALL ON ALL TABLES IN SCHEMA notification_schema TO notification_service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA notification_schema TO notification_service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA notification_schema TO notification_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA notification_schema GRANT ALL ON TABLES TO notification_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA notification_schema GRANT ALL ON SEQUENCES TO notification_service_role;

GRANT USAGE ON SCHEMA application_schema TO application_service_role;
GRANT ALL ON ALL TABLES IN SCHEMA application_schema TO application_service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA application_schema TO application_service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA application_schema TO application_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA application_schema GRANT ALL ON TABLES TO application_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA application_schema GRANT ALL ON SEQUENCES TO application_service_role;

GRANT USAGE ON SCHEMA internship_schema TO internship_service_role;
GRANT ALL ON ALL TABLES IN SCHEMA internship_schema TO internship_service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA internship_schema TO internship_service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA internship_schema TO internship_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA internship_schema GRANT ALL ON TABLES TO internship_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA internship_schema GRANT ALL ON SEQUENCES TO internship_service_role;

-- Grant cross-schema read permissions where needed
-- User service can read auth data
GRANT SELECT ON ALL TABLES IN SCHEMA auth_schema TO user_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth_schema GRANT SELECT ON TABLES TO user_service_role;

-- Application service can read user and institution data
GRANT SELECT ON ALL TABLES IN SCHEMA user_schema TO application_service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA institution_schema TO application_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA user_schema GRANT SELECT ON TABLES TO application_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA institution_schema GRANT SELECT ON TABLES TO application_service_role;

-- Internship service can read user and institution data
GRANT SELECT ON ALL TABLES IN SCHEMA user_schema TO internship_service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA institution_schema TO internship_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA user_schema GRANT SELECT ON TABLES TO internship_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA institution_schema GRANT SELECT ON TABLES TO internship_service_role;

-- Notification service can read data from all schemas (for sending notifications)
GRANT SELECT ON ALL TABLES IN SCHEMA auth_schema TO notification_service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA user_schema TO notification_service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA institution_schema TO notification_service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA application_schema TO notification_service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA internship_schema TO notification_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth_schema GRANT SELECT ON TABLES TO notification_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA user_schema GRANT SELECT ON TABLES TO notification_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA institution_schema GRANT SELECT ON TABLES TO notification_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA application_schema GRANT SELECT ON TABLES TO notification_service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA internship_schema GRANT SELECT ON TABLES TO notification_service_role;

-- Create common functions and types
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create audit log function
CREATE OR REPLACE FUNCTION create_audit_trigger(schema_name text, table_name text)
RETURNS void AS $$
DECLARE
    audit_table_name text;
    trigger_name text;
BEGIN
    audit_table_name := table_name || '_audit';
    trigger_name := table_name || '_audit_trigger';
    
    -- Create audit table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.%I (
            audit_id SERIAL PRIMARY KEY,
            operation CHAR(1) NOT NULL,
            audit_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            audit_user TEXT DEFAULT CURRENT_USER,
            old_data JSONB,
            new_data JSONB
        )', schema_name, audit_table_name);
    
    -- Create audit function
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.%I()
        RETURNS TRIGGER AS $audit$
        BEGIN
            IF TG_OP = ''DELETE'' THEN
                INSERT INTO %I.%I (operation, old_data)
                VALUES (''D'', row_to_json(OLD));
                RETURN OLD;
            ELSIF TG_OP = ''UPDATE'' THEN
                INSERT INTO %I.%I (operation, old_data, new_data)
                VALUES (''U'', row_to_json(OLD), row_to_json(NEW));
                RETURN NEW;
            ELSIF TG_OP = ''INSERT'' THEN
                INSERT INTO %I.%I (operation, new_data)
                VALUES (''I'', row_to_json(NEW));
                RETURN NEW;
            END IF;
            RETURN NULL;
        END;
        $audit$ LANGUAGE plpgsql;
    ', schema_name, trigger_name || '_func', schema_name, audit_table_name, 
       schema_name, audit_table_name, schema_name, audit_table_name);
    
    -- Create trigger
    EXECUTE format('
        DROP TRIGGER IF EXISTS %I ON %I.%I;
        CREATE TRIGGER %I
        AFTER INSERT OR UPDATE OR DELETE ON %I.%I
        FOR EACH ROW EXECUTE FUNCTION %I.%I();
    ', trigger_name, schema_name, table_name, trigger_name, 
       schema_name, table_name, schema_name, trigger_name || '_func');
END;
$$ LANGUAGE plpgsql;

-- Log completion
SELECT 'Schema setup completed successfully' AS status;