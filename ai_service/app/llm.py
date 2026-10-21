import os
import json
from pathlib import Path
import google.generativeai as genai
from .prompt import COMPLAINT_PROMPT

# Load ai_service/.env automatically when running uvicorn from the ai_service folder.
env_path = Path(__file__).resolve().parents[1] / '.env'
if env_path.exists():
    with env_path.open('r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value

api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise RuntimeError('GEMINI_API_KEY is required to run the AI service')

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-3.8-flash')


def parse_ai_text(raw_text):
    if not raw_text or not isinstance(raw_text, str):
        raise ValueError('AI returned an empty response')

    cleaned = raw_text.strip().replace('```json', '').replace('```', '').strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to extract first JSON object if wrapper text exists
        start = cleaned.find('{')
        end = cleaned.rfind('}')
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(cleaned[start:end+1])
            except json.JSONDecodeError:
                pass
        raise


def analyze_complaint(complaint):
    response = model.generate_content(
        COMPLAINT_PROMPT + '\nComplaint:\n' + complaint
    )

    ai_text = getattr(response, 'text', None)
    if not ai_text:
        raise ValueError('AI model returned no text response')

    return parse_ai_text(ai_text)
