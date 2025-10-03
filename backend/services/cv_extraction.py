import os
import re
import json
from dotenv import load_dotenv
import google.generativeai as genai
from models.cv import ExtractedCV

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


class CVExtractionError(Exception):
    pass


def extract_cv_details(cv_text: str) -> ExtractedCV:
    """
    Calls Gemini to extract candidate details from CV text.
    """
    prompt = f"""
You are an assistant that extracts structured candidate information from resumes.

Return a JSON object with these keys:
- name: string
- email: string
- summary: string
- education: list of strings
- experiences: list of strings
- responsabilities: list of strings
- tech_skills: list of strings
- soft_skills: list of strings
- certificates: list of strings

Only return valid JSON, no markdown fences, no extra text.

CV text:
\"\"\"{cv_text}\"\"\"
"""

    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt)
        print("+++++++++++",prompt)
        print("response --",response)

        if not response.candidates or not response.candidates[0].content.parts:
            raise CVExtractionError("Empty response from Gemini")

        raw_text = response.candidates[0].content.parts[0].text.strip()
        print("gemini resulttt",raw_text)

        # Cleanup possible "json" or ```json wrappers
        cleaned = raw_text.strip()
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```[a-zA-Z]*\s*|\s*```$", "", cleaned).strip()

        parsed = json.loads(cleaned)


        return ExtractedCV(**parsed)

    except Exception as e:
        raise CVExtractionError(str(e))
