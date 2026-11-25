"""Central configuration, read from environment variables (or a local .env file)."""
import os

from dotenv import load_dotenv

load_dotenv()


def _require(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable {name}. "
            "Copy .env.example to .env and fill it in."
        )
    return value


MONGO_URI = _require("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB", "safesight")

FACE_MODEL = os.getenv("FACE_MODEL", "Facenet")
FACE_DETECTOR = os.getenv("FACE_DETECTOR", "opencv")

# Cosine DISTANCE threshold: a pair is a match when distance < MATCH_THRESHOLD.
MATCH_THRESHOLD = float(os.getenv("MATCH_THRESHOLD", "0.40"))
TOP_K = int(os.getenv("TOP_K", "3"))

# Safety limits for downloading images
MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", str(10 * 1024 * 1024)))
DOWNLOAD_TIMEOUT = float(os.getenv("DOWNLOAD_TIMEOUT", "15"))
