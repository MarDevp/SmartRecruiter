from flask import Blueprint, request, jsonify, abort
from datetime import datetime
from bson import ObjectId
from pymongo import ReturnDocument
from models.cv import CVCreate
from services.cv_extraction import extract_cv_details, CVExtractionError
from flask_jwt_extended import jwt_required, get_jwt_identity

from db import get_db
import os
from werkzeug.utils import secure_filename
import pdfplumber
from flask import send_from_directory


cvs_bp = Blueprint("cvs", __name__)
# jobs_bp = Blueprint("jobs", __name__)


def serialize_cv(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


""" @cvs_bp.post("")
def upload_cv():
    payload = request.get_json(silent=True) or {}
    data = CVCreate(**payload).model_dump()

    db = get_db()
    now = datetime.utcnow()

    try:
        extracted = extract_cv_details(data["file_content"])
        extracted_dict = extracted.model_dump()
    except CVExtractionError as e:
        extracted_dict = {"error": str(e)}

    doc = {
        "job_id": ObjectId(data["job_id"]),
        "created_at": now,
        "updated_at": now,
        "extracted": extracted_dict
    }

    res = db.cvs.insert_one(doc)
    saved = db.cvs.find_one({"_id": res.inserted_id})

    return jsonify(serialize_cv(saved)), 201 """


UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads", "cvs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

"""@cvs_bp.post("")
def upload_cv():
    job_id = request.form.get("job_id")
    file = request.files.get("file")

    if not job_id or not file:
        return {"error": "job_id and file are required"}, 400

    # Save file to uploads/cvs/
    filename = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)
    # Extract text from PDF
    try:
        with pdfplumber.open(file) as pdf:
            text_pages = [page.extract_text() or "" for page in pdf.pages]
            file_content = "\n".join(text_pages)
    except Exception as e:
        return {"error": f"Could not extract PDF text: {str(e)}"}, 400

    now = datetime.utcnow()

    try:
        extracted = extract_cv_details(file_content)
        extracted_dict = extracted.model_dump()
    except CVExtractionError as e:
        extracted_dict = {"error": str(e)}

    doc = {
        "job_id": ObjectId(job_id),
        "created_at": now,
        "updated_at": now,
        "extracted": extracted_dict
    }

    print("******************",doc)
    db = get_db()
    res = db.cvs.insert_one(doc)
    print("111111111111",res)
    saved = db.cvs.find_one({"_id": res.inserted_id})
    print("2222222222",saved)
    return jsonify(serialize_cv(saved)), 201
"""

@cvs_bp.post("")
@jwt_required()
def upload_cvs():
    job_id = request.form.get("job_id")
    files = request.files.getlist("files")  # Grab a glorious list of files instead of just one

    if not job_id or not files:
        return {"error": "job_id and at least one file are required"}, 400

    db = get_db()
    now = datetime.utcnow()
    saved_docs = []

    for file in files:
        # Save each file elegantly
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)

        # Extract gorgeously structured text
        try:
            with pdfplumber.open(file) as pdf:
                text_pages = [page.extract_text() or "" for page in pdf.pages]
                file_content = "\n".join(text_pages)
        except Exception as e:
            saved_docs.append({
                "filename": filename,
                "error": f"Could not extract PDF text: {str(e)}"
            })
            continue

        # Extract thrilling CV details
        try:
            extracted = extract_cv_details(file_content)
            extracted_dict = extracted.model_dump()
        except CVExtractionError as e:
            extracted_dict = {"error": str(e)}

        # Create shiny new document
        doc = {
            "job_id": ObjectId(job_id),
            "created_at": now,
            "updated_at": now,
            "extracted": extracted_dict,
            "filename": filename
        }

        res = db.cvs.insert_one(doc)
        saved = db.cvs.find_one({"_id": res.inserted_id})
        saved_docs.append(serialize_cv(saved))

    return jsonify(saved_docs), 201


def serialize_cv(doc):
    if not doc:
        return None

    return {
        "id": str(doc["_id"]),
        "job_id": str(doc["job_id"]),
        "filename": str(doc.get("filename", "")),
        "score": doc.get("score", {}),
        "subscores": doc.get("subscores", {}),
        "created_at": doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else doc["created_at"],
        "updated_at": doc["updated_at"].isoformat() if isinstance(doc["updated_at"], datetime) else doc["updated_at"],
        "extracted": doc.get("extracted", {})
    }



@cvs_bp.get("")
@jwt_required()
def list_cvs():
    db = get_db()
    # Add a field "has_score" = 0 if no score, 1 if score exists
    pipeline = [
        {
            "$addFields": {
                "has_score": {
                    "$cond": [{"$ifNull": ["$score", False]}, 1, 0]
                }
            }
        },
        {
            "$sort": {
                "has_score": 1,   # 0 (no score) first, 1 (has score) after
                "score": -1       # then sort by score descending
            }
        }
    ]

    cursor = db.cvs.aggregate(pipeline)
    items = [serialize_cv(d) for d in cursor]
    return jsonify(items)



@cvs_bp.delete("/<cv_id>")
@jwt_required()
def delete_cv(cv_id):
    db = get_db()
    try:
        oid = ObjectId(cv_id)
    except Exception:
        abort(400, description="Invalid CV ID")

    deleted = db.cvs.find_one_and_delete({"_id": oid})
    if not deleted:
        abort(404, description="CV not found")

    return jsonify({"status": "deleted", "id": cv_id})


@cvs_bp.get("/job/<job_id>")
@jwt_required()
def get_cvs_by_job(job_id):
    db = get_db()
    try:
        oid = ObjectId(job_id)
    except Exception:
        abort(400, description="Invalid job_id")

    cursor = db.cvs.find({"job_id": oid}).sort("created_at", -1)
    cvs = [serialize_cv(d) for d in cursor]

    return jsonify(cvs)


@cvs_bp.patch("/<cv_id>/dissociate")
@jwt_required()
def dissociate_cv(cv_id):
    """
    Dissociate a CV from its job by setting job_id to None.
    """
    db = get_db()
    try:
        oid = ObjectId(cv_id)
    except Exception:
        abort(400, description="Invalid CV ID")

    updated = db.cvs.find_one_and_update(
        {"_id": oid},
        {"$set": {"job_id": None, "updated_at": datetime.utcnow()}},
        return_document=ReturnDocument.AFTER
    )

    if not updated:
        abort(404, description="CV not found")

    return jsonify(serialize_cv(updated))


@cvs_bp.get("/<cv_id>/file")
@jwt_required()
def get_cv_file(cv_id):
    db = get_db()
    try:
        oid = ObjectId(cv_id)
    except Exception:
        abort(400, description="Invalid CV ID")

    cv = db.cvs.find_one({"_id": oid})
    if not cv:
        abort(404, description="CV not found")

    filename = cv.get("filename")
    if not filename:
        abort(404, description="No file associated with this CV")

    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(file_path):
        abort(404, description="File not found on server")

    # This serves the file directly to the browser (inline = display)
    return send_from_directory(
        UPLOAD_FOLDER,
        filename,
        as_attachment=False,  # False → opens in browser, True → forces download
        mimetype="application/pdf"
    )