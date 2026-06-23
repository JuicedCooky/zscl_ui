FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git gcc g++ python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "backend:web_app", "--host", "0.0.0.0", "--port", "8000"]
