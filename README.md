download requirements:
pip install -r ui/requirements.txt

run the server starting from the parent directory of this repository:
python -m uvicorn [repo_folder_name].backend:app --reload

frontend only:
npm --prefix ui/frontend run dev

