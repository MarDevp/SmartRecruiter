from datetime import datetime
from flask import Blueprint, request, jsonify, abort
from bson import ObjectId
from pymongo import ReturnDocument
from flask_jwt_extended import jwt_required, get_jwt_identity

from db import get_db
from models.job import JobCreate, JobUpdate
from utils.serialization import serialize_job
from services.job_extraction import extract_job_requirements, JobExtractionError


jobs_bp = Blueprint("jobs", __name__)


def parse_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        abort(400, description="Invalid job id")


@jobs_bp.post("")
@jwt_required()
def create_job():
    payload = request.get_json(silent=True) or {}
    data = JobCreate(**payload).model_dump()
    now = datetime.utcnow()

    # Run extraction immediately
    extracted_dict, meta = extract_job_data(data.get("description", ""))

    doc = {
        **data,
        "status": "open",
        "created_at": now,
        "updated_at": now,
        "extracted": extracted_dict,
        "extraction": meta,
    }

    db = get_db()
    res = db.jobs.insert_one(doc)
    saved = db.jobs.find_one({"_id": res.inserted_id})
    return jsonify(serialize_job(saved)), 201



@jobs_bp.get("")
@jwt_required()
def list_jobs():
    db = get_db()
    q = request.args.get("q")
    page = int(request.args.get("page", 1))
    limit = min(100, int(request.args.get("limit", 20)))
    skip = (page - 1) * limit

    if q:
        query = {"$text": {"$search": q}}
    else:
        query = {}

    cursor = db.jobs.find(query)
    total = db.jobs.count_documents(query)  # ✅ safe and works in PyMongo >= 4

    items = [
        serialize_job(d) 
        for d in cursor.skip(skip).limit(limit).sort("updated_at", -1)
    ]

    return jsonify({
        "items": items,
        "page": page,
        "limit": limit,
        "total": total
    })



@jobs_bp.get("/<job_id>")
@jwt_required()
def get_job(job_id):
    db = get_db()
    oid = parse_object_id(job_id)
    doc = db.jobs.find_one({"_id": oid})
    if not doc:
        abort(404, description="Job not found")
    return jsonify(serialize_job(doc))


@jobs_bp.patch("/<job_id>")
@jwt_required()
def update_job(job_id):
    payload = request.get_json(silent=True) or {}
    data = JobUpdate(**payload).model_dump(exclude_unset=True)

    db = get_db()
    oid = parse_object_id(job_id)

    if "description" in data:
        # If description changed, run extraction again
        extracted_dict, meta = extract_job_data(data["description"])
        data["extracted"] = extracted_dict
        data["extraction"] = meta

    data["updated_at"] = datetime.utcnow()

    updated = db.jobs.find_one_and_update(
        {"_id": oid},
        {"$set": data},
        return_document=ReturnDocument.AFTER
    )

    if not updated:
        abort(404, description="Job not found")

    return jsonify(serialize_job(updated))



@jobs_bp.delete("/<job_id>")
@jwt_required()
def delete_job(job_id):
    db = get_db()
    oid = parse_object_id(job_id)
    res = db.jobs.delete_one({"_id": oid})
    if res.deleted_count == 0:
        abort(404, description="Job not found")
    return ("", 204)


def extract_job_data(description: str):
    """
    Returns (extracted_dict, meta) from Gemini.
    Does NOT touch the database.
    """
    now = datetime.utcnow()
    try:
        extracted = extract_job_requirements(description)
        extracted_dict = extracted.model_dump()
        meta = {
            "provider": "gemini",
            "model": "gemini-2.5-pro",
            "prompt_version": "v1",
            "status": "succeeded",
            "extracted_at": now,
            "error": None,
        }
    except JobExtractionError as e:
        extracted_dict = None
        meta = {
            "provider": "gemini",
            "model": "gemini-2.5-pro",
            "prompt_version": "v1",
            "status": "failed",
            "extracted_at": now,
            "error": str(e),
        }

    return extracted_dict, meta


'''@jobs_bp.post("/<job_id>/extract")
def extract_job(job_id):
    db = get_db()
    oid = parse_object_id(job_id)
    job = db.jobs.find_one({"_id": oid})
    if not job:
        abort(404, description="Job not found")

    extracted_dict, meta = extract_job_data(job.get("description", ""))

    return jsonify({
        "job_id": str(oid),
        "extracted": extracted_dict,
        "extraction": meta
    })'''

@jobs_bp.post("/<job_id>/extract")
@jwt_required()
def extract_job(job_id):
    db = get_db()
    oid = parse_object_id(job_id)
    job = db.jobs.find_one({"_id": oid})
    
    if not job:
        abort(404, description="Job not found")

    # Extract data from the description
    extracted_dict, meta = extract_job_data(job.get("description", ""))

    # Update the job document with the extracted data
    update_data = {
        "extracted": extracted_dict,
        "extraction": meta,
        "updated_at": datetime.utcnow()
    }

    # Perform the update
    updated = db.jobs.find_one_and_update(
        {"_id": oid},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER
    )

    if not updated:
        abort(404, description="Job not found after update")

    return jsonify({
        "job_id": str(oid),
        "extracted": extracted_dict,
        "extraction": meta
    })
