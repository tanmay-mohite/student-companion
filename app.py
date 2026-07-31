import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from config import Config
from routes import register_routes
from utils.logger import setup_logger, get_logger
from utils.errors import register_error_handlers
from utils.db import create_indexes

# Initialize logger
logger = get_logger("app")


def create_app():
    app = Flask(__name__, static_folder="static", static_url_path="")
    app.config.from_object(Config)
    CORS(app)

    # Setup logging
    setup_logger()

    # Register error handlers
    register_error_handlers(app)

    # Ensure upload directory exists
    os.makedirs(app.config.get("UPLOAD_FOLDER", "uploads"), exist_ok=True)

    # MongoDB connection
    client = MongoClient(
        app.config["MONGO_URI"],
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
    )
    app.db = client["student_companion"]

    # Verify connection
    try:
        client.admin.command("ping")
        logger.info("MongoDB connected successfully")
        # Create indexes for performance
        create_indexes(app.db)
        logger.info("MongoDB indexes verified")
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        print(f"WARNING: MongoDB connection failed: {e}")
        print("Check your .env file and ensure MONGO_URI is correct.")

    # Register all route blueprints
    register_routes(app)

    @app.route("/")
    def serve_index():
        return send_from_directory("static", "index.html")

    @app.route("/api/config/google-client-id")
    def google_client_id():
        """Expose Google Client ID for frontend Sign-In."""
        return jsonify({"client_id": app.config.get("GOOGLE_CLIENT_ID", "")})

    logger.info("Application initialized successfully")
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000, use_reloader=False)
