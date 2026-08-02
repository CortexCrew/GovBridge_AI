import google.generativeai as genai
from prompt import COMPLAINT_PROMPT

genai.configure(api_key="YOUR_API_KEY")

model = genai.GenerativeModel("gemini-2.5-flash")

def analyze_complaint(complaint):

    response = model.generate_content(

        COMPLAINT_PROMPT +
        "\nComplaint:\n" +
        complaint

    )

    return response.text