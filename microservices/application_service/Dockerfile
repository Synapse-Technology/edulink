FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=application_service.settings

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        build-essential \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Create shared directory for inter-service communication
RUN mkdir -p /app/shared

# Collect static files
RUN python manage.py collectstatic --noinput

# Create entrypoint script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Wait for database\n\
echo "Waiting for database..."\n\
while ! pg_isready -h ${DB_HOST:-postgres} -p ${DB_PORT:-5432} -U ${DB_USER:-edulink_user}; do\n\
  echo "Database is unavailable - sleeping"\n\
  sleep 1\n\
done\n\
echo "Database is up - executing command"\n\
\n\
# Run migrations\n\
python manage.py migrate\n\
\n\
# Create superuser if it does not exist\n\
python manage.py shell -c "\n\
from django.contrib.auth import get_user_model\n\
User = get_user_model()\n\
if not User.objects.filter(username=\"admin\").exists():\n\
    User.objects.create_superuser(\"admin\", \"admin@example.com\", \"admin123\")\n\
    print(\"Superuser created\")\n\
else:\n\
    print(\"Superuser already exists\")\n\
"\n\
\n\
# Execute the main command\n\
exec "$@"' > /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

# Expose port
EXPOSE 8002

# Set entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command
CMD ["python", "manage.py", "runserver", "0.0.0.0:8002"]