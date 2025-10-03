# routes/dashboard.py
from flask import Blueprint, jsonify
from db import get_db
from bson import ObjectId
from flask import abort
from collections import Counter
from difflib import SequenceMatcher
from flask_jwt_extended import jwt_required, get_jwt_identity


dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.get("/stats/jobs/count")
@jwt_required()
def count_jobs():
    """
    Return the total number of jobs.
    """
    db = get_db()
    total_jobs = db.jobs.count_documents({})
    return jsonify({"total_jobs": total_jobs})


@dashboard_bp.get("/stats/cvs-per-job")
@jwt_required()
def cvs_per_job():
    """
    Return the number of CVs associated with each job.
    Format: [{ job_id: "...", job_name: "...", cvs_count: N }]
    """
    db = get_db()

    # Aggregate CV counts grouped by job_id
    pipeline = [
        {"$group": {"_id": "$job_id", "cvs_count": {"$sum": 1}}},
        {"$sort": {"cvs_count": -1}}
    ]
    result = list(db.cvs.aggregate(pipeline))

    # Enrich with job names
    response = []
    for r in result:
        job_id = r["_id"]
        job_name = None
        if job_id:
            job = db.jobs.find_one({"_id": ObjectId(job_id)})
            job_name = job.get("name") if job else None

        response.append({
            "job_id": str(job_id) if job_id else None,
            "job_name": job_name,
            "cvs_count": r["cvs_count"]
        })

    return jsonify(response)


@dashboard_bp.get("/best_cv_per_job")
@jwt_required()
def best_cv_per_job():
    """
    For each job, return the CV with the highest score (if any).
    """
    db = get_db()

    # get all jobs
    jobs = list(db.jobs.find({}))

    results = []
    for job in jobs:
        job_id = job["_id"]

        # find the CV with the highest score for this job
        best_cv = db.cvs.find_one(
            {"job_id": ObjectId(job_id)},
            sort=[("score", -1)]  # highest score first
        )

        if best_cv:
            results.append({
                "job_id": str(job_id),
                "job_name": job.get("name"),
                "best_cv": {
                    "cv_id": str(best_cv["_id"]),
                    "name": best_cv.get("extracted", {}).get("name"),
                    "score": best_cv.get("score"),
                    "subscores": best_cv.get("subscores", {})
                }
            })
        else:
            # case when a job has no CVs
            results.append({
                "job_id": str(job_id),
                "job_name": job.get("name"),
                "best_cv": None
            })

    return jsonify(results)


@dashboard_bp.get("/jobs/average-score")
@jwt_required()
def jobs_average_score():
    """
    For each job, return the job info + the average of its CV scores.
    Only CVs with a numeric score are included in the average.
    """
    db = get_db()

    pipeline = [
        # Start from jobs so we include jobs even if they have 0 CVs
        {"$project": {
            "name": 1,
            "description": 1,
            "status": 1,
            "created_at": 1,
            "updated_at": 1
        }},
        {
            "$lookup": {
                "from": "cvs",
                "let": {"jobId": "$_id"},
                "pipeline": [
                    {"$match": {"$expr": {"$eq": ["$job_id", "$$jobId"]}}},
                    # Convert score to double; drop non-numeric/absent scores
                    {"$addFields": {
                        "score_num": {
                            "$convert": {
                                "input": "$score",
                                "to": "double",
                                "onError": None,
                                "onNull": None
                            }
                        }
                    }},
                    {"$match": {"score_num": {"$ne": None}}},
                    {"$group": {
                        "_id": None,
                        "avgScore": {"$avg": "$score_num"},
                        "cvCount": {"$sum": 1}
                    }}
                ],
                "as": "cvStats"
            }
        },
        # Pull stats out of the array (or set defaults)
        {"$addFields": {
            "average_score": {
                "$cond": [
                    {"$gt": [{"$size": "$cvStats"}, 0]},
                    {"$arrayElemAt": ["$cvStats.avgScore", 0]},
                    None
                ]
            },
            "cv_count_scored": {
                "$cond": [
                    {"$gt": [{"$size": "$cvStats"}, 0]},
                    {"$arrayElemAt": ["$cvStats.cvCount", 0]},
                    0
                ]
            }
        }},
        {"$project": {"cvStats": 0}},
        {"$sort": {"updated_at": -1}}
    ]

    rows = list(db.jobs.aggregate(pipeline))

    # Shape the response and round the average to 2 decimals
    out = []
    for r in rows:
        out.append({
            "job": {
                "id": str(r["_id"]),
                "name": r.get("name"),
                "description": r.get("description"),
                "status": r.get("status"),
                "created_at": r.get("created_at").isoformat() if r.get("created_at") else None,
                "updated_at": r.get("updated_at").isoformat() if r.get("updated_at") else None,
            },
            "average_score": round(r["average_score"], 2) if r.get("average_score") is not None else None,
            "cv_count_scored": int(r.get("cv_count_scored", 0))
        })

    return jsonify(out)

@dashboard_bp.get("/job/<job_id>/candidate_fit_radar")
@jwt_required()
def candidate_fit_radar(job_id):
    db = get_db()
    
    try:
        oid = ObjectId(job_id)
    except Exception:
        return jsonify({"error": "Invalid job_id"}), 400

    # Fetch all CVs for this job
    cvs = list(db.cvs.find({"job_id": oid}, {"extracted": 1, "subscores": 1, "score": 1, "id": 1, "filename": 1}))
    if not cvs:
        return jsonify({"job_id": job_id, "cvs": [], "message": "No CVs found"}), 404

    radar_data = []

    for cv in cvs:
        subscores = cv.get("subscores", {})
        radar_data.append({
            "cv_id": str(cv.get("id", cv.get("_id"))),
            "name": cv.get("extracted", {}).get("name", "Unknown"),
            "experience": subscores.get("experience", {}).get("score", 0),
            "education": subscores.get("education", {}).get("score", 0),
            "tech_skills": subscores.get("tech_skills", {}).get("score", 0),
            "soft_skills": subscores.get("soft_skills", {}).get("score", 0),
            "global_score": cv.get("score", 0)
        })

    return jsonify({
        "job_id": job_id,
        "radar_chart_data": radar_data
    })