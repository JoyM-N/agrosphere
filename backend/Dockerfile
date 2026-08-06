FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend /app/backend
COPY ml /app/ml

WORKDIR /app/backend

RUN chmod +x /app/backend/entrypoint.sh

ENV PYTHONUNBUFFERED=1
ENV ML_ARTIFACTS_PATH=/app/ml/artifacts
ENV ML_SOURCE_PATH=/app/ml

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -fsS http://127.0.0.1:8000/health || exit 1

ENTRYPOINT ["/app/backend/entrypoint.sh"]
