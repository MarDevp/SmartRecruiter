import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager
from datetime import timedelta

from db import init_db
from routes.jobs import jobs_bp
from routes.cvs import cvs_bp
from routes.matchings import match_bp
from routes.dashboard import dashboard_bp
from routes.auth import auth_bp 
from extensions import blacklist  



def create_app():
    load_dotenv()
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    #CORS(app)
    # --- JWT Config ---
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "super-secret")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    

    jwt = JWTManager(app)
       # --- Blacklist check ---
    @jwt.token_in_blocklist_loader
    def check_if_token_in_blacklist(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        return jti in blacklist


    init_db(app)
    app.register_blueprint(jobs_bp, url_prefix="/api/jobs")
    app.register_blueprint(cvs_bp, url_prefix="/api/cvs")
    app.register_blueprint(match_bp, url_prefix="/api/matchings")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)

