from fastapi import FastAPI, UploadFile, File, Body
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from botocore.exceptions import ClientError
from mangum import Mangum

import os
import io
import csv as _csv
import boto3

BUCKET = "continual-learning-bucket"
s3 = boto3.client("s3")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploaded_image = None

# 1. INITIALIZE THESE AS NONE IN THE GLOBAL SCOPE
device = None
pre_process = None

# ... (keep your METHOD_DISPLAY, discover_models, etc. here) ...

def initialize_backend():
    """Deferred heavy loading to bypass AWS Lambda's 10-second init limit."""
    global initialized, loaded_models, model_paths, class_names
    # 2. DECLARE DEVICE AND PRE_PROCESS AS GLOBAL HERE
    global torch, clip, device, pre_process 

    if initialized:
        return

    print("Initializing ML assets...")
    
    # 3. DO THE HEAVY IMPORTS HERE
    import torch
    import clip
    from PIL import Image
    from torchvision.transforms import Compose, Resize, CenterCrop, ToTensor, Normalize
    
    try:
        from torchvision.transforms import InterpolationMode
        _BICUBIC = InterpolationMode.BICUBIC
    except ImportError:
        _BICUBIC = Image.BICUBIC
        
    # 4. DEFINE THE VARIABLES *AFTER* TORCH IS IMPORTED
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    pre_process = Compose([
        Resize(224, interpolation=_BICUBIC),
        CenterCrop(224),
        lambda image: image.convert("RGB"),
        ToTensor(),
        Normalize((0.48145466, 0.4578275, 0.40821073), (0.26862954, 0.26130258, 0.27577711)),
    ])
    
    try:
        class_names = _load_classnames()
    except Exception as e:
        print(f"Failed to load classnames from S3: {e}")
        class_names = ["object"]

    sync_models()
    
    if model_paths:
        try:
            loaded_models[model_paths[0]] = load_model(model_paths[0])
        except Exception as e:
            print(f"Failed to load default model: {e}")
            
    initialized = True
    print("Initialization complete!")