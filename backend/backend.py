from fastapi import FastAPI, UploadFile, File, Body
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

import os
import sys
import csv as _csv
import gc
import json
import urllib.request

# Ensure the local clip/ package is found before any installed 'clip' PyPI package,
# regardless of whether this file runs as a module (Docker) or as part of a package (local dev).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import clip

# Create a global lock
HF_REPO = "JuicedCooky/continual-learning"
HF_BASE_URL = f"https://huggingface.co/{HF_REPO}/resolve/main"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

web_app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LAZY LOADING PLACEHOLDERS ---
torch = None
device = None
pre_process = None
initialized = False

uploaded_image = None

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

download_progress = {
    "current_file": "",
    "file_done": 0,
    "file_total": 0,
    "files_done": 0,
    "files_total": 0,
    "done": True,
}

def download_models_if_missing():
    """Download any .pth files from HuggingFace that aren't present locally."""
    global download_progress
    models_dir = os.path.join(BASE_DIR, "models")
    os.makedirs(models_dir, exist_ok=True)

    api_url = f"https://huggingface.co/api/models/{HF_REPO}"
    with urllib.request.urlopen(api_url) as r:
        siblings = json.loads(r.read().decode()).get("siblings", [])

    to_download = []
    for s in siblings:
        hf_path = s["rfilename"]
        if not (hf_path.startswith("models/") and hf_path.endswith(".pth")):
            continue
        rel = hf_path[len("models/"):]
        local_path = os.path.join(models_dir, *rel.split("/"))
        if not os.path.isfile(local_path):
            to_download.append((hf_path, local_path))

    if not to_download:
        return

    download_progress = {
        "current_file": "",
        "file_done": 0,
        "file_total": 0,
        "files_done": 0,
        "files_total": len(to_download),
        "done": False,
    }

    for hf_path, local_path in to_download:
        fname = os.path.basename(local_path)
        download_progress["current_file"] = fname
        download_progress["file_done"] = 0
        download_progress["file_total"] = 0

        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        url = f"{HF_BASE_URL}/{hf_path}"
        print(f"Downloading {url} ...")

        def _reporthook(blocks, block_size, total, _p=download_progress):
            if total > 0:
                _p["file_total"] = total
            _p["file_done"] = min(blocks * block_size, total if total > 0 else blocks * block_size)

        urllib.request.urlretrieve(url, local_path, reporthook=_reporthook)
        download_progress["files_done"] += 1
        print(f"Saved {local_path}")

    download_progress["done"] = True

def discover_models():
    """Walk local models/ dir and return sorted list of dicts."""
    models_dir = os.path.join(BASE_DIR, "models")
    root_files = []
    subfolder_files = []

    if not os.path.isdir(models_dir):
        return []

    for entry in os.listdir(models_dir):
        entry_path = os.path.join(models_dir, entry)
        if os.path.isfile(entry_path) and entry.endswith(".pth"):
            display = os.path.splitext(entry)[0].replace("_", " ").replace("-", " ").title()
            root_files.append({
                "path": entry_path,
                "rel": entry,
                "display_name": display,
                "group": "base",
            })
        elif os.path.isdir(entry_path):
            for fname in os.listdir(entry_path):
                if fname.endswith(".pth"):
                    subfolder_files.append({
                        "path": os.path.join(entry_path, fname),
                        "rel": f"{entry}/{fname}",
                        "display_name": make_display_name(entry, fname),
                        "group": entry,
                    })

    root_files.sort(key=lambda x: x["rel"])
    subfolder_files.sort(key=lambda x: x["rel"])
    return root_files + subfolder_files

# --- LAZY LOADING VARIABLES ---
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
    global model_paths, active_models, model_active_state
    discovered = discover_models()
    for i, m in enumerate(discovered):
        if m["path"] not in model_active_state:
            model_active_state[m["path"]] = (i == 0)
    model_paths = [m["path"] for m in discovered]
    active_models = [1 if model_active_state.get(p, False) else 0 for p in model_paths]
    return discovered

def load_model(model_path):
    model, _, _ = clip.load("ViT-B/16", device=device, jit=False)
    checkpoint = torch.load(model_path, map_location=device)
    model.load_state_dict(checkpoint["state_dict"], strict=False)
    del checkpoint
    model.eval()
    return model

def initialize_backend():
    global initialized, loaded_models, model_paths, class_names
    global torch, device, pre_process

    if initialized:
        return

    print("Initializing ML assets...")
    download_models_if_missing()

    import torch

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device} ({'GPU' if device.type == 'cuda' else 'CPU'})")
    _, _, pre_process = clip.load("ViT-B/16", device=device, jit=False)

    try:
        class_names = _load_classnames()
    except Exception as e:
        print(f"Failed to load classnames: {e}")
        class_names = ["object"]

    sync_models()

    if model_paths:
        try:
            loaded_models[model_paths[0]] = load_model(model_paths[0])
        except Exception as e:
            print(f"Failed to load default model: {e}")

    initialized = True
    print("Initialization complete!")

CLASSNAMES_FILE = os.path.join(BASE_DIR, "classes", "custom_classes.txt")

def _load_classnames():
    with open(CLASSNAMES_FILE, "r", encoding="utf-8") as f:
        return [l.strip() for l in f.read().splitlines() if l.strip()]

class_names = []

prompt_pre = "a photo of a"
prompt_suf = ""

@web_app.get("/tsne/base")
def getTsneBase():
    path = os.path.join(BASE_DIR, "tsne_images", "base_tsne.png")
    return FileResponse(path, media_type="image/png")

@web_app.get("/tsne/methods")
def getTsneMethods():
    tsne_dir = os.path.join(BASE_DIR, "tsne_images")
    methods = sorted(e for e in os.listdir(tsne_dir) if os.path.isdir(os.path.join(tsne_dir, e)))
    return {"methods": methods}

@web_app.get("/tsne-csv/methods")
def getTsneCsvMethods():
    csv_dir = os.path.join(BASE_DIR, "tsne_csv")
    methods = sorted(e for e in os.listdir(csv_dir) if os.path.isdir(os.path.join(csv_dir, e)))
    return {"methods": methods}

@web_app.get("/tsne/{method}/list")
def listTsneImages(method: str):
    if ".." in method:
        return {"error": "Method not found"}
    method_dir = os.path.join(BASE_DIR, "tsne_images", method)
    if not os.path.isdir(method_dir):
        return {"images": []}
    return {"images": sorted(f for f in os.listdir(method_dir) if f.endswith(".png"))}

@web_app.get("/tsne/{method}/{filename}")
def getTsneImage(method: str, filename: str):
    if ".." in method or ".." in filename:
        return {"error": "Invalid path"}
    path = os.path.join(BASE_DIR, "tsne_images", method, filename)
    if not os.path.isfile(path):
        return {"error": "Image not found"}
    return FileResponse(path, media_type="image/png")

def parse_tsne_csv(file_path: str):
    with open(file_path, "r", encoding="utf-8") as f:
        reader = _csv.DictReader(f)
        return [{"x": float(r["x"]), "y": float(r["y"]), "label": int(r["label"]), "classname": r["classname"], "dataset": r["dataset"]} for r in reader]

@web_app.get("/tsne-csv/base")
def getTsneCsvBase():
    return parse_tsne_csv(os.path.join(BASE_DIR, "tsne_csv", "base_tsne.csv"))

@web_app.get("/tsne-csv/{method}/list")
def listTsneCsvFiles(method: str):
    if ".." in method:
        return {"error": "Invalid path"}
    method_dir = os.path.join(BASE_DIR, "tsne_csv", method)
    if not os.path.isdir(method_dir):
        return {"error": "Method not found"}
    return {"files": sorted(f for f in os.listdir(method_dir) if f.endswith(".csv"))}

@web_app.get("/tsne-csv/{method}/{filename}")
def getTsneCsvFile(method: str, filename: str):
    if ".." in method or ".." in filename:
        return {"error": "Invalid path"}
    path = os.path.join(BASE_DIR, "tsne_csv", method, filename)
    if not os.path.isfile(path):
        return {"error": "File not found"}
    return parse_tsne_csv(path)

def parse_tsne_csv_3d(file_path: str):
    with open(file_path, "r", encoding="utf-8") as f:
        reader = _csv.DictReader(f)
        return [{"x": float(r["x"]), "y": float(r["y"]), "z": float(r["z"]), "label": int(r["label"]), "classname": r["classname"], "dataset": r["dataset"]} for r in reader]

@web_app.get("/tsne-csv-3d/methods")
def getTsneCsv3dMethods():
    csv3d_dir = os.path.join(BASE_DIR, "tsne_csv_3d")
    methods = sorted(e for e in os.listdir(csv3d_dir) if os.path.isdir(os.path.join(csv3d_dir, e)))
    return {"methods": methods}

@web_app.get("/tsne-csv-3d/base")
def getTsneCsv3dBase():
    return parse_tsne_csv_3d(os.path.join(BASE_DIR, "tsne_csv_3d", "base_tsne.csv"))

@web_app.get("/tsne-csv-3d/{method}/list")
def listTsneCsv3dFiles(method: str):
    if ".." in method:
        return {"error": "Invalid path"}
    method_dir = os.path.join(BASE_DIR, "tsne_csv_3d", method)
    if not os.path.isdir(method_dir):
        return {"error": "Method not found"}
    return {"files": sorted(f for f in os.listdir(method_dir) if f.endswith(".csv"))}

@web_app.get("/tsne-csv-3d/{method}/{filename}")
def getTsneCsv3dFile(method: str, filename: str):
    if ".." in method or ".." in filename:
        return {"error": "Invalid path"}
    path = os.path.join(BASE_DIR, "tsne_csv_3d", method, filename)
    if not os.path.isfile(path):
        return {"error": "File not found"}
    return parse_tsne_csv_3d(path)

@web_app.get("/download-progress")
def get_download_progress():
    return download_progress

@web_app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    global uploaded_image
    content = await file.read()
    uploaded_image = Image.open(__import__("io").BytesIO(content))
    return {"status": "ok"}

@web_app.get("/predict")
def predict():
    global uploaded_image, class_names, prompt_pre, prompt_suf, active_models, loaded_models, model_paths

    initialize_backend()

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

@web_app.get("/getclassnames")
def getClassNames():
    global class_names
    class_names = _load_classnames()
    return class_names

@web_app.get("/getprompt")
def getPrompt():
    return {"prefix": prompt_pre, "suffix": prompt_suf}

@web_app.post("/saveprompt")
def savePrompt(data: dict = Body(...)):
    global prompt_pre, prompt_suf

    if isinstance(data, list):
        prompt_pre = data[0]["prefix"]
        prompt_suf = data[0]["suffix"]
    else:
        prompt_pre = data["prefix"]
        prompt_suf = data["suffix"]

    return {"status": "ok"}

@web_app.post("/saveclassnames")
async def saveClassNames(data: dict = Body(...)):
    global class_names
    classes = data["text"]
    os.makedirs(os.path.dirname(CLASSNAMES_FILE), exist_ok=True)
    with open(CLASSNAMES_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(classes))
    class_names = [line.strip() for line in classes]
    return {"status": "ok"}

@web_app.get("/getmodels")
def getModels():
    initialize_backend()
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

@web_app.post("/setactivemodels")
def setActiveModels(data: list = Body(...), preload: bool = False):
    global active_models, loaded_models, model_paths
    initialize_backend()

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

@web_app.get("/predict_lowmem")
def predict_lowmem():
    global uploaded_image, class_names, prompt_pre, prompt_suf, active_models, model_paths
    initialize_backend()

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
            gc.collect()

        gc.collect()

        if device.type == "cuda":
            torch.cuda.empty_cache()

        return all_results

    except Exception as e:
        print("Error:", e)
        return {"error": str(e)}

@web_app.post("/setsequentialmodels")
def setSequentialModels(data: dict = Body(...)):
    global sequential_model_paths, loaded_models, include_base_clip
    initialize_backend()

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
        method_dir = os.path.join(BASE_DIR, "models", method_folder)
        dataset_name = DATASET_NAMES[dataset_index].lower()

        model_file = None
        if os.path.isdir(method_dir):
            for fname in sorted(os.listdir(method_dir)):
                if fname.endswith(".pth") and dataset_name in fname.lower():
                    model_file = fname
                    break

        if not model_file:
            return {"error": f"Model not found for {config.get('dataset', 'unknown')} with method {method}"}

        model_path = os.path.join(method_dir, model_file)

        if model_path not in sequential_model_paths:
            sequential_model_paths.append(model_path)

            if model_path not in loaded_models:
                try:
                    loaded_models[model_path] = load_model(model_path)
                except Exception as e:
                    return {"error": f"Failed to load model: {str(e)}"}

            loaded_model_names.append(f"{method_folder}/{model_file}")

    return {"status": "ok", "models": loaded_model_names}

@web_app.get("/predictsequential")
def predictSequential():
    global uploaded_image, class_names, prompt_pre, prompt_suf, sequential_model_paths, loaded_models, include_base_clip
    initialize_backend()

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
            base_model, _, _ = clip.load("ViT-B/16", device=device, jit=False)
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
            model_name = f"{os.path.basename(os.path.dirname(model_path))}/{os.path.basename(model_path)}"

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(web_app, host="0.0.0.0", port=8000)
