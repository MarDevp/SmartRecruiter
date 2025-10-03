from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity, get_jwt
)
from bson import ObjectId
from datetime import datetime
from db import get_db
from extensions import blacklist  # ✅ import from extensions.py

auth_bp = Blueprint("auth", __name__)

# --- SIGN UP ---
@auth_bp.post("/signup")
def signup():
    db = get_db()
    data = request.get_json()

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"error": "All fields are required"}), 400

    if db.users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 400

    hashed_password = generate_password_hash(password)

    user = {
        "username": username,
        "email": email,
        "password": hashed_password,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    result = db.users.insert_one(user)

    return jsonify({
        "message": "User registered successfully",
        "user_id": str(result.inserted_id)
    }), 201


# --- SIGN IN ---
@auth_bp.post("/signin")
def signin():
    db = get_db()
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    user = db.users.find_one({"email": email})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    access_token = create_access_token(identity=str(user["_id"]))

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"]
        }
    }), 200


# --- Profile ---
@auth_bp.get("/me")
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(user_id)}, {"password": 0})

    if not user:
        return jsonify({"error": "User not found"}), 404

    user["id"] = str(user["_id"])
    del user["_id"]

    return jsonify(user)


# --- Logout ---
@auth_bp.post("/logout")
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    blacklist.add(jti)
    return jsonify({"msg": "Successfully logged out"}), 200
