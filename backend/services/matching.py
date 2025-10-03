from typing import Dict
import google.generativeai as genai
import json
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model_name="gemini-2.5-flash"


def _parse_gemini_response(response):
    """
    Helper to safely parse Gemini response into JSON.
    Always returns a dict with {score: float, short_justification: str}.
    """
    text_output = ""
    try:
        text_output = response.candidates[0].content.parts[0].text.strip()

        # Remove Markdown fences if they appear anyway
        if text_output.startswith("```"):
            text_output = text_output.strip("`")
            text_output = text_output.split("json")[-1].strip()

        parsed = json.loads(text_output)

        # Normalize result
        score = parsed.get("score", 0.0)
        if isinstance(score, str):
            try:
                score = float(score)
            except Exception:
                score = 0.0  # fallback if "null" or bad string
        return {
            "score": float(score),
            "short_justification": parsed.get("short_justification", "")
        }

    except Exception as e:
        print("⚠️ Error parsing Gemini response:", e)
        print("Raw text output:", text_output)
        return {"score": 0.0, "short_justification": "Parsing failed"}



def calculate_score_experience(job_experiences, cv_experiences):
    prompt = f"""
    Job experiences: {job_experiences}
    CV experiences: {cv_experiences}
    """

    system_instruction = """
    You are an assistant that calculates how well a candidate's CV experiences match a job's required experiences. 
    Your task is to return a JSON with a single numeric score between 0 and 1, where:
    - 1 means the CV fully satisfies or exceeds all job experience requirements.
    - 0 means no match at all.

    Rules:
    - Compare both the years of experience and the domain/role.
    - If years in CV ≥ years required → full credit for years.
    - If CV years < required years → proportional credit.
    - Role match: if CV role matches or is semantically close → credit, else 0.
    - Combine years (70%) and role match (30%) to produce each subscore.
    - Average across all job requirements.
    - Always return the SAME score for the same input (no randomness).

    Return JSON only, no markdown fences, no extra text result should be in this format
    { "score": 0.xx , "short_justification": string }
    """


    model = genai.GenerativeModel(model_name, system_instruction=system_instruction)

    response = model.generate_content(prompt)
    result = _parse_gemini_response(response)
  
    return result


def calculate_score_education(job_education, cv_education):

    print("job_education",job_education)
    print("cv_education",cv_education)
    prompt = f"""
    Job required education: {job_education}
    CV education: {cv_education}
    """

    system_instruction = """
You are an assistant that calculates how well a candidate's CV education matches a job's required education.
Return a JSON with a single numeric score between 0 and 1.

Rules:
- The job may require multiple degrees. Treat each required degree as a separate condition.
- For each required degree, check BOTH:
    1. Degree level (PhD > Master's > Bachelor's > Associate > High School).
    2. Field of study (must be the same or semantically close).
- Subscore rules:
    * If CV has a degree in the same/close field AND level >= required → 1
    * If CV has the right field but lower degree level → proportional score (e.g., Bachelor's vs Master's = 0.5)
    * If CV has the right level but wrong field → 0
    * If CV has no relevant degree → 0
- When multiple required degrees exist, average the subscores.
  Examples:
    - Job requires [Master’s in CS, Master’s in Security], CV has only Master’s in CS → 0.5
    - Job requires [Master’s in CS, Master’s in Security], CV has PhD in CS only → 0.5
    - Job requires [Master’s in CS, Master’s in Security], CV has both → 1
    - Job requires [Bachelor’s in Math], CV has Master’s in Biology → 0
- If no explicit requirement in job → score 1.
- Always return the SAME score for the same input (no randomness).

Return JSON only, no markdown fences, no extra text.
Format:
{ "score": 0.xx , "short_justification": string }
"""
    

    model = genai.GenerativeModel(
        model_name,
        system_instruction=system_instruction
    )

    response = model.generate_content(prompt)
    print("response resu",response)
    result = _parse_gemini_response(response)

    return result


def calculate_score_tech_skills(job_skills, cv_skills):
    prompt = f"""
    Job required technical skills: {job_skills}
    CV technical skills: {cv_skills}
    """

    system_instruction = """
You are an assistant that calculates how well a candidate's CV technical skills match a job's required technical skills.
Return a JSON with a single numeric score between 0 and 1.

Rules:
- The job may list multiple required technical skills. Treat each as a separate condition.
- Subscore rules:
    * If CV contains the exact skill → 1
    * If CV contains a related/close skill (e.g., TensorFlow vs PyTorch, Java vs Kotlin) → 0.5
    * If CV does not contain the skill at all → 0
- Average across all required skills.
- If job does not list any required skills → score 1.
- Always return the SAME score for the same input (no randomness).

Return JSON only, no markdown fences, no extra text.
Format:
{ "score": 0.xx ,"short_justification": string }
"""
    
    model = genai.GenerativeModel(
       model_name,
        system_instruction=system_instruction
    )

    response = model.generate_content(prompt)
    result = _parse_gemini_response(response)

    return result

def calculate_score_soft_skills(job_soft_skills, cv_soft_skills):
    prompt = f"""
    Job required soft skills: {job_soft_skills}
    CV soft skills: {cv_soft_skills}
    """

    system_instruction = """
You are an assistant that calculates how well a candidate's CV soft skills match a job's required soft skills.
Return a JSON with a single numeric score between 0 and 1.

Rules:
- The job may list multiple required soft skills. Treat each as a separate condition.
- Subscore rules:
    * If CV contains the exact skill → 1
    * If CV contains a related/close skill (e.g., communication vs team player) → 0.5
    * If CV does not contain the skill at all → 0
- Average across all required skills.
- If job does not list any required skills → score 1.
- Always return the SAME score for the same input (no randomness).

Return JSON only, no markdown fences, no extra text.
Format:
{ "score": 0.xx , "short_justification": string }
"""
    
    model = genai.GenerativeModel(
        model_name,
        system_instruction=system_instruction
    )

    response = model.generate_content(prompt)
    result = _parse_gemini_response(response)

    return result


def score_calculate(job: Dict, cv: Dict) -> float:
    """
    Calculate global matching score between a job and a CV.
    """
    # Extract fields
    job_experience = job.get("experiences", [])
    cv_experience = cv.get("experiences", [])
    job_education = job.get("education", [])
    cv_education = cv.get("education", [])
    job_skills = job.get("tech_skills", [])
    cv_skills = cv.get("tech_skills", [])
    job_soft_skills = job.get("soft_skills", [])
    cv_soft_skills = cv.get("soft_skills", [])



    experience = calculate_score_experience(job_experience, cv_experience)
    education = calculate_score_education(job_education, cv_education)
    tech = calculate_score_tech_skills(job_skills, cv_skills)
    soft = calculate_score_soft_skills(job_soft_skills, cv_soft_skills)

    # Weights
    weights = {
        "education": 0.15,
        "experiences": 0.25,
        "tech_skills": 0.50,
        "soft_skills": 0.10
    }



    global_score = (
        weights["education"] * education["score"] +
        weights["experiences"] * experience["score"] +
        weights["tech_skills"] * tech["score"] +
        weights["soft_skills"] * soft["score"]
    )

    return {
        "score": round(global_score, 2),  # ✅ global score
        "subscores": {
            "experience": experience,
            "education": education,
            "tech_skills": tech,
            "soft_skills": soft
        }
    }
