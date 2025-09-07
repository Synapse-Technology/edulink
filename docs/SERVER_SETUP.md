# Production Server Setup Guide

## Overview

This guide explains how to set up the production server for the Edulink platform deployment.

## Server Directory Structure

The GitHub Actions workflow expects the following directory structure on the production server:

```
~/edulink-deployment/
├── .env                    # Production environment variables
├── docker-compose.prod.yml # Production Docker Compose configuration
└── deploy.log             # Deployment logs (created automatically)
```

## Initial Server Setup

### 1. Create Deployment Directory

```bash
mkdir -p ~/edulink-deployment
cd ~/edulink-deployment
```

### 2. Copy Required Files

Copy the following files from the repository to the server:

```bash
# Copy docker-compose.prod.yml from the repository root
scp docker-compose.prod.yml user@server:~/edulink-deployment/

# Copy and configure environment file
scp .env.production user@server:~/edulink-deployment/.env
```

### 3. Configure Environment Variables

Edit the `.env` file on the server with production-specific values:

```bash
vi ~/edulink-deployment/.env
```

Ensure all required environment variables are set:
- `DATABASE_URL`
- `REDIS_URL`
- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`
- `BACKEND_IMAGE`, `FRONTEND_IMAGE`

## GitHub Actions Workflow Requirements

The CI/CD pipeline expects:

1. **SSH Access**: The workflow connects via SSH using `DEPLOY_KEY` secret
2. **Docker**: Docker and Docker Compose must be installed on the server
3. **Directory Structure**: The `~/edulink-deployment` directory must exist with required files
4. **Permissions**: The deployment user must have Docker permissions

## Troubleshooting

### Directory Not Found Error

If you see `cd ~/edulink-deployment` failing in GitHub Actions:

1. Ensure the directory exists on the production server
2. Verify the SSH user has access to the home directory
3. Check that the deployment files are present

### Missing Files Error

If deployment fails due to missing files:

1. Verify `docker-compose.prod.yml` is in the deployment directory
2. Ensure `.env` file exists and is properly configured
3. Check file permissions are correct

## Manual Deployment

For manual deployment, use the provided deployment script:

```bash
# On the production server
cd ~/edulink-deployment
bash deploy.sh
```

This script will:
- Create necessary directories
- Validate required files
- Backup the database
- Pull latest Docker images
- Deploy with zero-downtime
- Clean up old images