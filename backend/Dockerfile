# Official Microsoft Playwright image — Chromium + all system deps pre-installed
# Version MUST match playwright==1.48.0 in requirements.txt
FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose default port (Render injects $PORT at runtime)
EXPOSE 10000

# Use shell form so $PORT env var is expanded at runtime
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}
