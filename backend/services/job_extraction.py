import os
from typing import Dict, Any
from dotenv import load_dotenv
import google.generativeai as genai
from pydantic import BaseModel
from models.job import Extracted  # reuse your Pydantic schema
import json
import re


load_dotenv()

# Configure Gemini client
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


class JobExtractionError(Exception):
    pass


def extract_job_requirements(description: str) -> Extracted:
    prompt = f"""
You are an assistant that extracts structured job requirements.

Given the following job description, return a JSON object with exactly these keys:
- education: list of strings
- experiences: list of strings
- responsabilities: list of strings
- tech_skills: list of strings
- soft_skills: list of strings

Only return valid JSON, no extra text.

Job description:
\"\"\"{description}\"\"\"
"""
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")  # ✅ safer model name
        response = model.generate_content(prompt)

        # Extract usable text
        raw_text = None
        if hasattr(response, "text") and response.text:
            raw_text = response.text.strip()
        elif response.candidates and response.candidates[0].content.parts:
            raw_text = response.candidates[0].content.parts[0].text.strip()

        print("deeee",raw_text)
        if not raw_text:
            raise JobExtractionError("Empty response from Gemini")


    
          # Clean the response
        cleaned = raw_text.strip()

        # Remove a leading "json" or ```json
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```[a-zA-Z]*\s*|\s*```$", "", cleaned).strip()

        try:
            parsed: Dict[str, Any] = json.loads(cleaned)
        except json.JSONDecodeError as e:
            raise JobExtractionError(f"Failed to parse JSON from Gemini: {e}")

        return Extracted(**parsed)

    except Exception as e:
        raise JobExtractionError(str(e))
