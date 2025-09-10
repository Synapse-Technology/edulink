web: cd Edulink && gunicorn Edulink.wsgi:application --bind 0.0.0.0:$PORT
worker: cd Edulink && celery -A Edulink worker --loglevel=info
beat: cd Edulink && celery -A Edulink beat --loglevel=info