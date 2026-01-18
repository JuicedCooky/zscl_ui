from fastapi import FastAPI, UploadFile, File, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

import torch

import clip
from .clip import clip

from PIL import Image

import os
import io


base_path = os.path.dirname(__file__)
frontend_path = os.path.join(os.path.dirname(base_path), "frontend")


app = FastAPI()


app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path,"dist/assets")), name='assets')
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploaded_image = None

# assert torch.cuda.is_available()

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Model paths array (for Home page)
model_paths = [
    os.path.join(base_path, "models/zscl+freeze/flowers.pth"),
    os.path.join(base_path, "models/finetune/flowers.pth"),  # Temporary placeholder path
]

# Active models array (0 = inactive, 1 = active)
active_models = [1, 0]  # First model active by default

# Dictionary to store loaded models
loaded_models = {}

# Sequential model configuration (for Sequential page)
# Maps method folder names to their file prefixes
METHOD_FOLDERS = {
    "finetune": "finetune",
    "zscl": "zscl",
    "zscl+freeze": "zscl+freeze",
    "zscl+ogd": "zscl+ogd",
}

# Dataset names as they appear in model filenames (lowercase)
DATASET_NAMES = ["base", "dtd", "mnist", "eurosat", "flowers"]

# Current sequential model selections (list of model paths)
sequential_model_paths = []
# Whether to include base CLIP in predictions
include_base_clip = False

# Load base CLIP components
_, _, pre_process = clip.load("ViT-B/16", device=device, jit=False)


def load_model(path):
    """Load a single CLIP model from checkpoint"""
    model, _, _ = clip.load("ViT-B/16", device=device, jit=False)
    checkpoint = torch.load(path)
    model.load_state_dict(checkpoint["state_dict"], strict=False)
    model.eval()
    return model


# Load the first model by default
loaded_models[model_paths[0]] = load_model(model_paths[0])

classname_path = os.path.join(base_path, "classes/custom_classes.txt") 

with open(classname_path) as f:
    lines = f.readlines()

class_names = [line.strip() for line in lines]

prompt_pre = "a photo of a"
prompt_suf = ""

@app.get("/")
def default():
    return FileResponse(os.path.join(frontend_path, "dist/index.html"))

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    global uploaded_image
    
    content = await file.read()
    uploaded_image = Image.open(io.BytesIO(content))

    return {"status": "ok"}

@app.get("/predict")
def predict():
    global uploaded_image, class_names, prompt_pre, prompt_suf, active_models, loaded_models, model_paths

    if prompt_pre.endswith(" "):
        prompt_pre = prompt_pre[:-1]

    prompts = [f"{prompt_pre} {name} {prompt_suf}".strip() for name in class_names]

    if uploaded_image is None:
        return {"error": "No image uploaded yet"}

    # Get list of active model paths
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
            model_name = os.path.basename(model_path)

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
    with open(classname_path) as f:
        lines = f.readlines()
    
    class_names = [line.strip() for line in lines]

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
    with open(classname_path, "w") as file:
        file.write(text)

    class_names = [line.strip() for line in classes]

    return {"status": "ok"}


@app.get("/getmodels")
def getModels():
    """Get the list of model paths and their active status"""
    global model_paths, active_models
    return {
        "models": [os.path.basename(path) for path in model_paths],
        "active": active_models
    }


@app.post("/setactivemodels")
def setActiveModels(data: list = Body(...)):
    """
    Set which models are active. Multiple models can be active at the same time.
    Receives an array of 0s and 1s representing inactive/active status.
    Example: [1, 1] means both models active, [1, 0] means only first active
    """
    global active_models, loaded_models, model_paths

    if len(data) != len(model_paths):
        return {"error": f"Expected array of length {len(model_paths)}, got {len(data)}"}

    if not all(v in [0, 1] for v in data):
        return {"error": "Array must contain only 0 or 1 values"}

    active_models = data

    # Load all active models that aren't already loaded
    for i, is_active in enumerate(active_models):
        if is_active == 1 and model_paths[i] not in loaded_models:
            try:
                loaded_models[model_paths[i]] = load_model(model_paths[i])
            except Exception as e:
                return {"error": f"Failed to load model {model_paths[i]}: {str(e)}"}

    return {"status": "ok", "active": active_models}


@app.post("/setsequentialmodels")
def setSequentialModels(data: dict = Body(...)):
    """
    Set multiple sequential models based on dataset and training method selections.
    Receives: { models: [{ datasetIndex: int, dataset: str, method: str }, ...] }
    """
    global sequential_model_paths, loaded_models, include_base_clip

    models_config = data.get("models", [])

    # Reset
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

        # For base model, use the original CLIP model (no fine-tuning)
        if dataset_index == 0 or dataset == "basemodelclip":
            include_base_clip = True
            loaded_model_names.append("Base CLIP (ViT-B/16)")
            continue

        # For other datasets, method must be selected
        if not method:
            return {"error": f"No training method selected for {config.get('dataset', 'unknown')}"}

        if method not in METHOD_FOLDERS:
            return {"error": f"Unknown method: {method}"}

        # Construct model path: models/{method}/{dataset}.pth
        method_folder = METHOD_FOLDERS[method]
        models_dir = os.path.join(base_path, "models", method_folder)

        # Find the model file for this dataset
        dataset_name = DATASET_NAMES[dataset_index].lower()

        # Look for model files matching the dataset name
        model_file = None
        if os.path.exists(models_dir):
            for filename in os.listdir(models_dir):
                if filename.endswith(".pth") and dataset_name in filename.lower():
                    model_file = filename
                    break

        if not model_file:
            return {"error": f"Model not found for {config.get('dataset', 'unknown')} with method {method}"}

        model_path = os.path.join(models_dir, model_file)

        # Avoid duplicates
        if model_path not in sequential_model_paths:
            sequential_model_paths.append(model_path)

            # Load the model if not already loaded
            if model_path not in loaded_models:
                try:
                    loaded_models[model_path] = load_model(model_path)
                except Exception as e:
                    return {"error": f"Failed to load model: {str(e)}"}

            # Include method folder in model name to distinguish same dataset with different methods
            display_name = f"{method_folder}/{model_file}"
            loaded_model_names.append(display_name)

    return {"status": "ok", "models": loaded_model_names}


@app.get("/predictsequential")
def predictSequential():
    """Predict using multiple sequential model selections"""
    global uploaded_image, class_names, prompt_pre, prompt_suf, sequential_model_paths, loaded_models, include_base_clip

    if prompt_pre.endswith(" "):
        prompt_pre = prompt_pre[:-1]

    prompts = [f"{prompt_pre} {name} {prompt_suf}".strip() for name in class_names]

    if uploaded_image is None:
        return {"error": "No image uploaded yet"}

    # Check if any models have been selected
    if not include_base_clip and not sequential_model_paths:
        return {"error": "No models selected"}

    try:
        image = pre_process(uploaded_image).unsqueeze(0).to(device)
        text = clip.tokenize(prompts).to(device)

        all_results = {}

        # Include base CLIP if selected
        if include_base_clip:
            base_model, _, _ = clip.load("ViT-B/16", device=device, jit=False)
            with torch.no_grad():
                logits_per_image, _ = base_model(image, text)
                probs = logits_per_image.softmax(dim=-1).cpu().numpy()

            result = dict(zip(prompts, probs.tolist()[0]))
            result = dict(sorted(result.items(), key=lambda item: item[1], reverse=True))
            all_results["Base CLIP"] = result

        # Predict with each selected model
        for model_path in sequential_model_paths:
            if model_path not in loaded_models:
                continue

            model = loaded_models[model_path]
            # Include method folder in model name to distinguish same dataset with different methods
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