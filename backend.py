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

app = FastAPI()

build_path = os.path.join(base_path, "frontend/dist/assets")

app.mount("/assets", StaticFiles(directory=build_path), name='assets')
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

model,_,pre_process = clip.load("ViT-B/16", device=device, jit=False)
checkpoint = torch.load(os.path.join(base_path, "Aircraft.pth"))

model.load_state_dict(checkpoint["state_dict"], strict=False)
model.eval()

classname_path = os.path.join(base_path, "imagenet_classes.txt") 

with open(classname_path) as f:
    lines = f.readlines()

class_names = [line.strip() for line in lines]



@app.get("/")
def default():
    return FileResponse(os.path.join(base_path, "frontend/dist/index.html"))

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    global uploaded_image
    
    content = await file.read()
    uploaded_image = Image.open(io.BytesIO(content))

    return {"status": "ok"}

@app.get("/predict")
def predict():
    global uploaded_image, class_names

    print(class_names[-1])

    prompts = [f"a photo of a {name}" for name in class_names]

    if uploaded_image is None:
        return {"error": "No image uploaded yet"}

    try:
        image = pre_process(uploaded_image).unsqueeze(0).to(device)
        text = clip.tokenize(prompts).to(device)


        with torch.no_grad():
            image_feat = model.encode_image(image)
            text_feat = model.encode_text(text)

            logits_per_image, _ = model(image, text)
            probs = logits_per_image.softmax(dim=-1).cpu().numpy()

        result = dict(zip(prompts, probs.tolist()[0]))
        result = dict(sorted(result.items(), key=lambda item: item[1], reverse=True))

        return result
    
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

@app.post("/saveclassnames")
async def saveClassNames(data: dict = Body(...)):
    global class_names
    classes = data["text"]
    text = "\n".join(classes)
    with open(classname_path, "w") as file:
        file.write(text)
        
    class_names = [line.strip() for line in classes]

    return {"status": "ok"}