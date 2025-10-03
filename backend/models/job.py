from typing import List, Optional, Literal
from pydantic import BaseModel, Field



class JobBase(BaseModel):
    name: str = Field(min_length=1)
    description: str = Field(min_length=1)


class JobCreate(JobBase):
    status: Literal["open","closed"] = "open"


class JobUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[Literal["open","closed"]] = None


class Extracted(BaseModel):
    education: Optional[List[str]] = None
    experiences: Optional[List[str]] = None
    responsabilities: Optional[List[str]] = None
    tech_skills: Optional[List[str]] = None
    soft_skills: Optional[List[str]] = None
    
  
