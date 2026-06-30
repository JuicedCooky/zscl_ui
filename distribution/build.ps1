Write-Host "Detecting Host GPU..." -ForegroundColor Cyan

# Check if nvidia-smi exists and run it
try {
    $nvidiaOutput = & nvidia-smi 2>&1
} catch {
    $nvidiaOutput = $null
}

if (-not $nvidiaOutput) {
    Write-Host "No GPU detected or nvidia-smi missing. Defaulting to CPU." -ForegroundColor Yellow
    $WHEEL_URL = ""
} else {
    # Extract the CUDA version using Regex
    $match = $nvidiaOutput | Select-String -Pattern "CUDA Version:\s*([0-9]+\.[0-9]+)"
    
    if ($match) {
        $HOST_CUDA = $match.Matches[0].Groups[1].Value
        Write-Host "Detected CUDA Version: $HOST_CUDA" -ForegroundColor Green
        
        if ($HOST_CUDA -like "13.*" -or $HOST_CUDA -like "12.*") {
        Write-Host "Preparing cu121 wheels for CUDA 12/13..." -ForegroundColor Green
        $WHEEL_URL = "--extra-index-url https://download.pytorch.org/whl/cu121"
        } elseif ($HOST_CUDA -like "11.*") {
            Write-Host "Preparing cu118 wheels..." -ForegroundColor Green
            $WHEEL_URL = "--extra-index-url https://download.pytorch.org/whl/cu118"
        } else {
            Write-Host "Unsupported CUDA version. Defaulting to standard PyTorch." -ForegroundColor Yellow
            $WHEEL_URL = ""
        }
    } else {
        Write-Host "Could not parse CUDA version. Defaulting to CPU." -ForegroundColor Red
        $WHEEL_URL = ""
    }
}

# Export the variable to the current session so Docker Compose can see it
$env:PYTORCH_WHEEL_URL = $WHEEL_URL

Write-Host "Starting Docker Build..." -ForegroundColor Cyan
docker compose build 

Write-Host "Starting Container..." -ForegroundColor Cyan
docker compose up -d 