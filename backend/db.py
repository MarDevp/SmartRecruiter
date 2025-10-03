import os
from datetime import datetime
from pymongo import MongoClient, ASCENDING
from pymongo.errors import CollectionInvalid

_client = None
_db = None


def get_db():
    if _db is None:
        raise RuntimeError("DB not initialized. Call init_db(app) first.")
    return _db


def init_db(app=None):
    global _client, _db
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    name = os.getenv("DB_NAME", "cv_ranker")

    _client = MongoClient(uri)
    _db = _client[name]

    # --- Jobs collection ---
    validator = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["name", "description", "status", "created_at", "updated_at"],
            "properties": {
                "name": {"bsonType": "string", "description": "Job title"},
                "description": {"bsonType": "string"},
                "status": {"enum": ["draft", "open", "closed", "archived"]},
                "extracted": {"bsonType": ["object", "null"]},
                "created_at": {"bsonType": "date"},
                "updated_at": {"bsonType": "date"}
            }
        }
    }

    try:
        _db.create_collection("jobs", validator=validator, validationLevel="moderate")
    except CollectionInvalid:
        # Collection already exists: update validator
        try:
            _db.command({
                "collMod": "jobs",
                "validator": validator,
                "validationLevel": "moderate"
            })
        except Exception:
            pass

    coll = _db["jobs"]
    coll.create_index([("name", ASCENDING)])
    # Text index for simple search
    coll.create_index([("name", "text"), ("description", "text")], default_language="english")

    # --- CV collection ---
    cv_validator = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["job_id", "created_at", "updated_at"],
            "properties": {
                "job_id": {"bsonType": ["objectId","null"]},
                "extracted": {"bsonType": ["object", "null"]},
                "created_at": {"bsonType": "date"},
                "updated_at": {"bsonType": "date"}
            }
        }
    }

    try:
        _db.create_collection("cvs", validator=cv_validator, validationLevel="moderate")
    except CollectionInvalid:
        try:
            _db.command({
                "collMod": "cvs",
                "validator": cv_validator,
                "validationLevel": "moderate"
            })
        except Exception:
            pass

    _db["cvs"].create_index([("job_id", ASCENDING)])

    return _db
