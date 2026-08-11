from fastapi import APIRouter
from .llm import analyze_complaint

router = APIRouter()

@router.post("/analyze")
def analyze(data: dict):

    complaint = data["title"] + " " + data["description"]

    result = analyze_complaint(complaint)

    return result