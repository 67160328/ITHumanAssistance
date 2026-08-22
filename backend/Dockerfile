# Use official Python lightweight image (as taught in Lab 2 of curriculum)
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . /app/backend

# Expose FastAPI port
EXPOSE 8000

# Command to run uvicorn server (as taught in Capstone Lab of curriculum)
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
