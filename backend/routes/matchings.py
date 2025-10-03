from flask import Blueprint, jsonify
from db import get_db
from services.matching import score_calculate  # the scoring function we wrote
from bson import ObjectId
from flask_jwt_extended import jwt_required, get_jwt_identity

match_bp = Blueprint("matchings", __name__)

@match_bp.get("/generate_scores/<job_id>")
@jwt_required()
def generate_scores(job_id):
    """
    For all CVs associated with job_id that have no score,
    calculate the matching score vs job description and save it in DB.
    """
    try:
        db = get_db()

        # 1. Fetch job
        job = db.jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            return jsonify({"error": "Job not found"}), 404

        job_extracted = job.get("extracted", {})

        # 2. Fetch only CVs for this job that don't yet have a score
        cvs = list(db.cvs.find({
            "job_id": ObjectId(job_id),
            "score": {"$exists": False}  # only CVs with no score
        }))
        
        if not cvs:
            return jsonify({
                "job_id": str(job["_id"]),
                "cvs": [],
                "message": "No new CVs without scores or no cvs associated"
            })

        results = []

        # 3. Score each CV

        for cv in cvs:
            cv_extracted = cv.get("extracted", {})
            score_details = score_calculate(job_extracted, cv_extracted)

            db.cvs.update_one(
                {"_id": cv["_id"]},
                {"$set": {
                    "score": score_details["score"],      # ✅ global score
                    "subscores": score_details["subscores"]  # ✅ detailed breakdown
                }}
            )

            results.append({
                "cv_id": str(cv["_id"]),
                "score": score_details["score"],
                "subscores": score_details["subscores"]
            })

        return jsonify({
            "job": {
                "id": str(job["_id"]),
                "description": job.get("description")
            },
            "cvs": results
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
"""

        for cv in cvs:
            cv_extracted = cv.get("extracted", {})
            score_details = score_calculate(job_extracted, cv_extracted)

            # ✅ Save score into CV document
            db.cvs.update_one(
                {"_id": cv["_id"]},
                {"$set": {"score": score_details}}
            )

            results.append({
                "cv_id": str(cv["_id"]),
                "score": score_details
            })

        # 4. Return updated job + CV scores
        return jsonify({
            "job": {
                "id": str(job["_id"]),
                "description": job.get("description"),
                #"extracted": job_extracted
            },
            "cvs": results
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

        """