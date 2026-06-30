#!/bin/bash
source /app/.venv/bin/activate

echo "Checking for NVIDIA GPU access..."

HAS_GPU=false

# Check 1: Has the Docker runtime injected nvidia-smi?
if command -v nvidia-smi &> /dev/null; then
    HAS_GPU=true
# Check 2: Is this a Windows WSL2 virtualization layer?
elif [ -d "/usr/lib/wsl/drivers" ]; then
    HAS_GPU=true
# Check 3: Traditional Linux hardware paths
elif ls /dev/nvidia* &> /dev/null; then
    HAS_GPU=true
fi

if [ "$HAS_GPU" = true ]; then
    echo "NVIDIA GPU detected successfully!"
    
    # Verify if a working CUDA-enabled PyTorch is already present
    if ! python3 -c "import torch; assert torch.cuda.is_available()" &> /dev/null; then
        echo "CUDA PyTorch is missing or invalid. Installing PyTorch with CUDA 12.4 support..."
        pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cu124
    else
        echo "CUDA PyTorch is already installed and verified operational!"
    fi
else
    echo "No NVIDIA GPU detected by the container. Ensuring CPU PyTorch..."
    if ! python3 -c "import torch" &> /dev/null; then
        pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
    fi
fi

echo "Starting application..."
exec uvicorn backend:web_app --host 0.0.0.0 --port 8000