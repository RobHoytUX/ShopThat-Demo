# backend/Dockerfile

FROM python:3.11-slim

# Install native deps
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential cmake swig libopenblas-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1) Copy your Poetry manifests from backend/parser into /app
COPY backend/parser/pyproject.toml backend/parser/poetry.lock /app/

# 2) Install Poetry & only your production deps
RUN pip install --upgrade pip --root-user-action=ignore && \
    pip install poetry --root-user-action=ignore && \
    poetry config virtualenvs.create false && \
    poetry install --no-root --without dev --no-interaction --no-ansi


# 3) Copy your application code (the parser folder) into /app
COPY backend/parser/app /app/

# Expose and launch
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

