# Steps

## Requirements
1. Python Requirements:
```
pip install -r ui/requirements.txt
```
2. Download PyTorch that is compatible with your system: https://pytorch.org/get-started/locally/

3. Download pretrained ZSCL model: https://drive.google.com/file/d/1QMpFQwiZ3Vkz6b_yLOI3q2j19ljLSzit/view?usp=sharing

## Running
Run the server starting from the parent directory of this repository:
```
python -m uvicorn zscl_ui.backend:app --reload
```

Run frontend only:
```
npm --prefix zscl_ui/frontend run dev
```
