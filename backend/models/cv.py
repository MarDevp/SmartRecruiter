from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any


class CVBase(BaseModel):
    job_id: str = Field(..., description="Associated job ID")
    name: str
    email: EmailStr
    summary: Optional[str] = None
    education: List[str] = []
    experiences: List[str] = []
    responsabilities: List[str] = []
    tech_skills: List[str] = []
    soft_skills: List[str] = []
    certificates: List[str] = []


class CVCreate(BaseModel):
    job_id: str
    file_content: str  # raw text extracted from PDF/Word/Plain text


class ExtractedCV(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    summary: Optional[str] = None
    education: List[str] = []
    experiences: List[str] = []
    responsabilities: List[str] = []
    tech_skills: List[str] = []
    soft_skills: List[str] = []
    certificates: List[str] = []


class CVInDB(CVBase):
    id: Any
    created_at: datetime
    updated_at: datetime
    extracted: Optional[ExtractedCV] = None
