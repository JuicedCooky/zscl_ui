FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git gcc g++ python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN python -m venv /app/.venv

ENV PATH="/app/.venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
