#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Collect static files
python edulink/manage.py collectstatic --no-input

# Run migrations
python edulink/manage.py migrate
