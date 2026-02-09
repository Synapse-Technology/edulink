# Backend Dockerfile
FROM python:3.11-slim as builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim as production
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/root/.local/bin:$PATH \
    DJANGO_SETTINGS_MODULE=edulink.config.settings.prod

RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r edulink && useradd -r -g edulink edulink
WORKDIR /app
RUN mkdir -p /app/staticfiles /app/mediafiles /app/logs && chown -R edulink:edulink /app

COPY --from=builder /root/.local /root/.local
COPY edulink/ edulink/

RUN chown -R edulink:edulink /app

USER edulink

EXPOSE 8000

CMD ["gunicorn", "edulink.config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120"]
