from bson import ObjectId
from datetime import datetime


def to_str_id(maybe_id):
    if isinstance(maybe_id, ObjectId):
        return str(maybe_id)
    return maybe_id


def serialize_job(doc: dict) -> dict:
    if not doc:
        return doc
    out = {**doc}
    out["_id"] = to_str_id(doc.get("_id"))
    # Convert datetimes to ISO strings for JSON responses
    for k in ("created_at", "updated_at"):
        if isinstance(out.get(k), datetime):
            out[k] = out[k].isoformat()
    return out
