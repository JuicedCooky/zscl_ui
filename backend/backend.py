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


METHOD_DISPLAY = {
    "finetune": "Finetune",
    "zscl": "ZSCL",
    "zscl+freeze": "ZSCL+Freeze",
    "zscl+ogd": "ZSCL+OGD",
}

def make_display_name(method_folder: str, filename: str) -> str:
    dataset = os.path.splitext(filename)[0]
    method = METHOD_DISPLAY.get(method_folder.lower(), method_folder.replace("+", "+").title())
    return f"{method} - {dataset.title()}"

def discover_models():
    """List models/ in S3 and return sorted list of dicts with path, rel, display_name, group."""
    root_files = []
    subfolder_files = []
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=BUCKET, Prefix="backend/models/"):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            rel = key[len("backend/models/"):]
            if not rel:
                continue
            parts = rel.split("/")
            if len(parts) == 1 and parts[0].endswith(".pth"):
                fname = parts[0]
                display = os.path.splitext(fname)[0].replace("_", " ").replace("-", " ").title()
                root_files.append({
                    "path": key,
                    "rel": fname,
                    "display_name": display,
                    "group": "base",
                })
            elif len(parts) == 2 and parts[1].endswith(".pth"):
                folder, fname = parts
                subfolder_files.append({
                    "path": key,
                    "rel": f"{folder}/{fname}",
                    "display_name": make_display_name(folder, fname),
                    "group": folder,
                })
    root_files.sort(key=lambda x: x["rel"])
    subfolder_files.sort(key=lambda x: x["rel"])
    return root_files + subfolder_files

# --- LAZY LOADING VARIABLES ---
initialized = False
model_active_state: dict = {}
model_paths: list = []
active_models: list = []
loaded_models = {}

METHOD_FOLDERS = {
    "finetune": "finetune",
    "zscl": "zscl",
    "zscl+freeze": "zscl+freeze",
    "zscl+ogd": "zscl+ogd",
}
DATASET_NAMES = ["base", "dtd", "mnist", "eurosat", "flowers"]

sequential_model_paths = []
include_base_clip = False

def sync_models():
    """Re-scan models dir and update model_paths / active_models globals."""
    global model_paths, active_models, model_active_state
    discovered = discover_models()
    for i, m in enumerate(discovered):
        if m["path"] not in model_active_state:
            model_active_state[m["path"]] = (i == 0)
    model_paths = [m["path"] for m in discovered]
    active_models = [1 if model_active_state.get(p, False) else 0 for p in model_paths]
    return discovered

_base_state_dict_cache = None

def _get_base_state_dict():
    global _base_state_dict_cache
    if _base_state_dict_cache is None:
        buf = io.BytesIO()
        s3.download_fileobj(BUCKET, "backend/models/base.pth", buf)
        buf.seek(0)
        _base_state_dict_cache = torch.load(buf, map_location=device)["state_dict"]
    return _base_state_dict_cache

def load_model(s3_key):
    """Build CLIP architecture from base.pth, then overlay fine-tuned weights from S3."""
    model = clip.model.build_model(_get_base_state_dict()).to(device)
    if s3_key != "backend/models/base.pth":
        buf = io.BytesIO()
        s3.download_fileobj(BUCKET, s3_key, buf)
        buf.seek(0)
        checkpoint = torch.load(buf, map_location=device)
        model.load_state_dict(checkpoint["state_dict"], strict=False)
    model.eval()
    return model

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
    
CLASSNAMES_KEY = "backend/classes/custom_classes.txt"

def _load_classnames():
    buf = io.BytesIO()
    s3.download_fileobj(BUCKET, CLASSNAMES_KEY, buf)
    return [l.strip() for l in buf.getvalue().decode("utf-8").splitlines() if l.strip()]

class_names = []

prompt_pre = "a photo of a"
prompt_suf = ""

@app.get("/tsne/base")
def getTsneBase():
    obj = s3.get_object(Bucket=BUCKET, Key="backend/tsne_images/base_tsne.png")
    return StreamingResponse(obj["Body"], media_type="image/png")

@app.get("/tsne/methods")
def getTsneMethods():
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix="backend/tsne_images/", Delimiter="/")
    methods = sorted(p["Prefix"][len("backend/tsne_images/"):].rstrip("/") for p in resp.get("CommonPrefixes", []))
    return {"methods": methods}

@app.get("/tsne/{method}/list")
def listTsneImages(method: str):
    if ".." in method:
        return {"error": "Method not found"}
    prefix = f"backend/tsne_images/{method}/"
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix=prefix)
    files = sorted(obj["Key"][len(prefix):] for obj in resp.get("Contents", []) if obj["Key"].endswith(".png"))
    return {"images": files}

@app.get("/tsne/{method}/{filename}")
def getTsneImage(method: str, filename: str):
    if ".." in method or ".." in filename:
        return {"error": "Invalid path"}
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=f"backend/tsne_images/{method}/{filename}")
        return StreamingResponse(obj["Body"], media_type="image/png")
    except ClientError:
        return {"error": "Image not found"}

def parse_tsne_csv(s3_key: str):
    buf = io.BytesIO()
    s3.download_fileobj(BUCKET, s3_key, buf)
    reader = _csv.DictReader(io.StringIO(buf.getvalue().decode("utf-8")))
    return [{"x": float(r["x"]), "y": float(r["y"]), "label": int(r["label"]), "classname": r["classname"], "dataset": r["dataset"]} for r in reader]

@app.get("/tsne-csv/base")
def getTsneCsvBase():
    return parse_tsne_csv("backend/tsne_csv/base_tsne.csv")

@app.get("/tsne-csv/{method}/list")
def listTsneCsvFiles(method: str):
    if ".." in method:
        return {"error": "Invalid path"}
    prefix = f"backend/tsne_csv/{method}/"
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix=prefix)
    if not resp.get("Contents"):
        return {"error": "Method not found"}
    return {"files": sorted(obj["Key"][len(prefix):] for obj in resp["Contents"] if obj["Key"].endswith(".csv"))}

@app.get("/tsne-csv/{method}/{filename}")
def getTsneCsvFile(method: str, filename: str):
    if ".." in method or ".." in filename:
        return {"error": "Invalid path"}
    try:
        return parse_tsne_csv(f"backend/tsne_csv/{method}/{filename}")
    except ClientError:
        return {"error": "File not found"}

def parse_tsne_csv_3d(s3_key: str):
    buf = io.BytesIO()
    s3.download_fileobj(BUCKET, s3_key, buf)
    reader = _csv.DictReader(io.StringIO(buf.getvalue().decode("utf-8")))
    return [{"x": float(r["x"]), "y": float(r["y"]), "z": float(r["z"]), "label": int(r["label"]), "classname": r["classname"], "dataset": r["dataset"]} for r in reader]

@app.get("/tsne-csv-3d/methods")
def getTsneCsv3dMethods():
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix="backend/tsne_csv_3d/", Delimiter="/")
    methods = sorted(p["Prefix"][len("backend/tsne_csv_3d/"):].rstrip("/") for p in resp.get("CommonPrefixes", []))
    return {"methods": methods}

@app.get("/tsne-csv-3d/base")
def getTsneCsv3dBase():
    return parse_tsne_csv_3d("backend/tsne_csv_3d/base_tsne.csv")

@app.get("/tsne-csv-3d/{method}/list")
def listTsneCsv3dFiles(method: str):
    if ".." in method:
        return {"error": "Invalid path"}
    prefix = f"backend/tsne_csv_3d/{method}/"
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix=prefix)
    if not resp.get("Contents"):
        return {"error": "Method not found"}
    return {"files": sorted(obj["Key"][len(prefix):] for obj in resp["Contents"] if obj["Key"].endswith(".csv"))}

@app.get("/tsne-csv-3d/{method}/{filename}")
def getTsneCsv3dFile(method: str, filename: str):
    if ".." in method or ".." in filename:
        return {"error": "Invalid path"}
    try:
        return parse_tsne_csv_3d(f"backend/tsne_csv_3d/{method}/{filename}")
    except ClientError:
        return {"error": "File not found"}


@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    global uploaded_image
    content = await file.read()
    uploaded_image = Image.open(io.BytesIO(content))
    return {"status": "ok"}

@app.get("/predict")
def predict():
    global uploaded_image, class_names, prompt_pre, prompt_suf, active_models, loaded_models, model_paths
    
    initialize_backend() # <--- LAZY LOAD TRIGGER

    if prompt_pre.endswith(" "):
        prompt_pre = prompt_pre[:-1]

    prompts = [f"{prompt_pre} {name} {prompt_suf}".strip() for name in class_names]

    if uploaded_image is None:
        return {"error": "No image uploaded yet"}

    active_model_paths = [model_paths[i] for i, is_active in enumerate(active_models) if is_active == 1]

    if not active_model_paths:
        return {"error": "No active models selected"}

    try:
        image = pre_process(uploaded_image).unsqueeze(0).to(device)
        text = clip.tokenize(prompts).to(device)

        all_results = {}

        for model_path in active_model_paths:
            if model_path not in loaded_models:
                continue

            model = loaded_models[model_path]
            model_name = make_display_name(
                os.path.basename(os.path.dirname(model_path)),
                os.path.basename(model_path),
            )

            with torch.no_grad():
                logits_per_image, _ = model(image, text)
                probs = logits_per_image.softmax(dim=-1).cpu().numpy()

            result = dict(zip(prompts, probs.tolist()[0]))
            result = dict(sorted(result.items(), key=lambda item: item[1], reverse=True))
            all_results[model_name] = result

        return all_results

    except Exception as e:
        print("Error:", e)
        return {"error": str(e)}

@app.get("/getclassnames")
def getClassNames():
    global class_names
    class_names = _load_classnames()
    return class_names

@app.get("/getprompt")
def getPrompt():
    global prompt_pre, prompt_suf
    return {"prefix": prompt_pre, "suffix": prompt_suf}

@app.post("/saveprompt")
def savePrompt(data: dict = Body(...)):
    global prompt_pre, prompt_suf

    if isinstance(prompt_pre, list):
        prompt_pre = data[0]["prefix"]
    else:
        prompt_pre = data["prefix"]

    if isinstance(prompt_suf, list):
        prompt_suf = data[0]["suffix"]
    else:
        prompt_suf = data["suffix"]

    return {"status": "ok"}

@app.post("/saveclassnames")
async def saveClassNames(data: dict = Body(...)):
    global class_names
    classes = data["text"]
    text = "\n".join(classes)
    s3.put_object(Bucket=BUCKET, Key=CLASSNAMES_KEY, Body=text.encode("utf-8"))
    class_names = [line.strip() for line in classes]
    return {"status": "ok"}

@app.get("/getmodels")
def getModels():
    """Rescan models/ dir and return list with display names and active state."""
    initialize_backend() # <--- LAZY LOAD TRIGGER
    discovered = sync_models()
    return {
        "models": [
            {
                "rel": m["rel"],
                "display_name": m["display_name"],
                "group": m["group"],
                "active": model_active_state.get(m["path"], False),
            }
            for m in discovered
        ]
    }

@app.post("/setactivemodels")
def setActiveModels(data: list = Body(...), preload: bool = True):
    global active_models, loaded_models, model_paths
    initialize_backend() # <--- LAZY LOAD TRIGGER

    if len(data) != len(model_paths):
        return {"error": f"Expected array of length {len(model_paths)}, got {len(data)}"}

    if not all(v in [0, 1] for v in data):
        return {"error": "Array must contain only 0 or 1 values"}

    active_models = data

    for i, is_active in enumerate(active_models):
        model_active_state[model_paths[i]] = (is_active == 1)

    if preload:
        for i, is_active in enumerate(active_models):
            if is_active == 1 and model_paths[i] not in loaded_models:
                try:
                    loaded_models[model_paths[i]] = load_model(model_paths[i])
                except Exception as e:
                    return {"error": f"Failed to load model {model_paths[i]}: {str(e)}"}

    return {"status": "ok", "active": active_models}

@app.get("/predict_lowmem")
def predict_lowmem():
    global uploaded_image, class_names, prompt_pre, prompt_suf, active_models, model_paths
    initialize_backend() # <--- LAZY LOAD TRIGGER

    if uploaded_image is None:
        return {"error": "No image uploaded yet"}

    active_model_paths = [model_paths[i] for i, is_active in enumerate(active_models) if is_active == 1]
    if not active_model_paths:
        return {"error": "No active models selected"}

    if prompt_pre.endswith(" "):
        prompt_pre = prompt_pre[:-1]
    prompts = [f"{prompt_pre} {name} {prompt_suf}".strip() for name in class_names]

    try:
        image = pre_process(uploaded_image).unsqueeze(0).to(device)
        text = clip.tokenize(prompts).to(device)
        all_results = {}

        for model_path in active_model_paths:
            model = load_model(model_path)
            model_name = make_display_name(
                os.path.basename(os.path.dirname(model_path)),
                os.path.basename(model_path),
            )
            with torch.no_grad():
                logits_per_image, _ = model(image, text)
                probs = logits_per_image.softmax(dim=-1).cpu().numpy()

            result = dict(zip(prompts, probs.tolist()[0]))
            result = dict(sorted(result.items(), key=lambda item: item[1], reverse=True))
            all_results[model_name] = result

            del model
            if device.type == "cuda":
                torch.cuda.empty_cache()

        return all_results

    except Exception as e:
        print("Error:", e)
        return {"error": str(e)}

@app.post("/setsequentialmodels")
def setSequentialModels(data: dict = Body(...)):
    global sequential_model_paths, loaded_models, include_base_clip
    initialize_backend() # <--- LAZY LOAD TRIGGER

    models_config = data.get("models", [])
    sequential_model_paths = []
    include_base_clip = False

    if not models_config:
        return {"error": "No models specified"}

    loaded_model_names = []

    for config in models_config:
        dataset_index = config.get("datasetIndex", -1)
        dataset = config.get("dataset", "").lower().replace(" ", "").replace("/", "")
        method = config.get("method")

        if dataset_index < 0:
            continue

        if dataset_index == 0 or dataset == "basemodelclip":
            include_base_clip = True
            loaded_model_names.append("Base CLIP (ViT-B/16)")
            continue

        if not method:
            return {"error": f"No training method selected for {config.get('dataset', 'unknown')}"}

        if method not in METHOD_FOLDERS:
            return {"error": f"Unknown method: {method}"}

        method_folder = METHOD_FOLDERS[method]
        s3_prefix = f"backend/models/{method_folder}/"
        dataset_name = DATASET_NAMES[dataset_index].lower()

        model_file = None
        response = s3.list_objects_v2(Bucket=BUCKET, Prefix=s3_prefix)
        for obj in response.get("Contents", []):
            filename = obj["Key"].split("/")[-1]
            if filename.endswith(".pth") and dataset_name in filename.lower():
                model_file = filename
                break

        if not model_file:
            return {"error": f"Model not found for {config.get('dataset', 'unknown')} with method {method}"}

        model_path = f"backend/models/{method_folder}/{model_file}"

        if model_path not in sequential_model_paths:
            sequential_model_paths.append(model_path)

            if model_path not in loaded_models:
                try:
                    loaded_models[model_path] = load_model(model_path)
                except Exception as e:
                    return {"error": f"Failed to load model: {str(e)}"}

            display_name = f"{method_folder}/{model_file}"
            loaded_model_names.append(display_name)

    return {"status": "ok", "models": loaded_model_names}

@app.get("/predictsequential")
def predictSequential():
    global uploaded_image, class_names, prompt_pre, prompt_suf, sequential_model_paths, loaded_models, include_base_clip
    initialize_backend() # <--- LAZY LOAD TRIGGER

    if prompt_pre.endswith(" "):
        prompt_pre = prompt_pre[:-1]

    prompts = [f"{prompt_pre} {name} {prompt_suf}".strip() for name in class_names]

    if uploaded_image is None:
        return {"error": "No image uploaded yet"}

    if not include_base_clip and not sequential_model_paths:
        return {"error": "No models selected"}

    try:
        image = pre_process(uploaded_image).unsqueeze(0).to(device)
        text = clip.tokenize(prompts).to(device)

        all_results = {}

        if include_base_clip:
            base_model = load_model("backend/models/base.pth")
            with torch.no_grad():
                logits_per_image, _ = base_model(image, text)
                probs = logits_per_image.softmax(dim=-1).cpu().numpy()

            result = dict(zip(prompts, probs.tolist()[0]))
            result = dict(sorted(result.items(), key=lambda item: item[1], reverse=True))
            all_results["Base CLIP"] = result

        for model_path in sequential_model_paths:
            if model_path not in loaded_models:
                continue

            model = loaded_models[model_path]
            model_file = os.path.basename(model_path)
            method_folder = os.path.basename(os.path.dirname(model_path))
            model_name = f"{method_folder}/{model_file}"

            with torch.no_grad():
                logits_per_image, _ = model(image, text)
                probs = logits_per_image.softmax(dim=-1).cpu().numpy()

            result = dict(zip(prompts, probs.tolist()[0]))
            result = dict(sorted(result.items(), key=lambda item: item[1], reverse=True))
            all_results[model_name] = result

        return all_results

    except Exception as e:
        print("Error:", e)
        return {"error": str(e)}

# ==========================================
# LAMBDA HANDLER (MANGUM WRAPPER)
# ==========================================
handler = Mangum(app)