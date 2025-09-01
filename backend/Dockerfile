# Give Railway a Python environment
FROM python:3.11-slim

# Work inside /app
WORKDIR /app

# Copy your whole project into the image
COPY . /app

# Install backend dependencies (Rork created backend/requirements.txt)
RUN pip install --no-cache-dir -r backend/requirements.txt

# Railway uses this port
ENV PORT=8000
EXPOSE 8000

# Start your backend server
CMD ["python3", "backend/main.py"]
