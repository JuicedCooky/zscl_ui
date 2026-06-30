#!/bin/bash

echo "Detecting Host GPU..."
HOST_CUDA=$(nvidia-smi | grep -Eo "CUDA Version: [0-9]+\.[0-9]+" | awk '{print $3}')

if [ -z "$HOST_CUDA" ]; then
    echo "No GPU detected. Defaulting to CPU."
    WHEEL_URL=""
elif [[ "$HOST_CUDA" == 12.* ]]; then
    echo "Detected CUDA 12.x. Preparing cu121 wheels..."
    WHEEL_URL="--extra-index-url https://download.pytorch.org/whl/cu121"
elif [[ "$HOST_CUDA" == 11.* ]]; then
    echo "Detected CUDA 11.x. Preparing cu118 wheels..."
    WHEEL_URL="--extra-index-url https://download.pytorch.org/whl/cu118"
else
    echo "Unsupported CUDA version. Defaulting to standard PyTorch."
    WHEEL_URL=""
fi

# Pass the URL as a build argument to Docker Compose
export PYTORCH_WHEEL_URL="$WHEEL_URL"
docker compose build backend
docker compose up -d backend