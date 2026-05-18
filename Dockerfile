# ─────────────────────────────────────────────
# Seeker Django/Daphne image
# ─────────────────────────────────────────────
FROM python:3.11-slim

# Prevents .pyc files and enables real-time logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# ── Layer 1: system deps (rarely changes) ────
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 2: Python deps (only re-runs when requirements.txt changes) ─
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Layer 3: application code (re-runs on any code change) ───────────
COPY . .

# Default command — overridden per-service in docker-compose.yml
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
