#!/usr/bin/env bash
# Build script for Render deployment

set -o errexit  # exit on error

echo "Starting build process..."

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r Edulink/requirements.txt

# Navigate to Django project directory
cd Edulink

# Copy frontend assets to static directory
echo "Copying frontend assets..."
cp -r ../Edulink_website/assets/* static/
cp -r ../Edulink_website/js/* static/js/
cp -r ../Edulink_website/css/* static/css/ 2>/dev/null || true

# Collect static files
echo "Collecting static files..."
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

echo "Build process completed successfully!"