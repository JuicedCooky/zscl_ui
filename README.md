# Steps

## Requirements
1. Python Requirements:
```
pip install -r ui/requirements.txt
```
2. Download PyTorch that is compatible with your system: https://pytorch.org/get-started/locally/

3. Download pretrained ZSCL model and place in the ./backend folder: https://drive.google.com/file/d/1QMpFQwiZ3Vkz6b_yLOI3q2j19ljLSzit/view?usp=sharing

### Download node.js
https://nodejs.org/en/download

### Install frontend packages
From the parent directory:
```
npm install --prefix ./frontend/
```

## Running
### Frontend
Build the frontend UI:
From the parent directory:
```
npm run build --prefix ./frontend/
```

### backend
Run the server starting from the parent directory of this repository:

```
python -m uvicorn backend.backend:app --reload
```
or
```
uvicorn backend.backend:app --reload
```

Run frontend only:
```
npm --prefix ./frontend run dev
```
