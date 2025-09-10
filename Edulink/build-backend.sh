#!/usr/bin/env bash
# Backend-only build script for Render deployment

set -o errexit  # exit on error

echo "Starting backend build process..."

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r Edulink/requirements.txt

# Change to the Edulink directory for Django commands
cd Edulink

# Collect static files (Django admin and DRF only)
echo "Collecting Django static files..."
python manage.py collectstatic --noinput --clear

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Create superuser if it doesn't exist (optional)
echo "Creating superuser if needed..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser(
        username='admin',
        email='admin@edulink.com',
        password='changeme123!'
    )
    print('Superuser created')
else:
    print('Superuser already exists')
"

echo "Backend build process completed successfully!"