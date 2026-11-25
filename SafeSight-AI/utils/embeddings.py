"""Image download, face embedding and similarity helpers shared by all routes."""
import os
import tempfile
from io import BytesIO
from urllib.parse import urlparse

import numpy as np
import requests
from deepface import DeepFace
from PIL import Image, UnidentifiedImageError

from config import DOWNLOAD_TIMEOUT, FACE_DETECTOR, FACE_MODEL, MAX_IMAGE_BYTES


class FaceError(Exception):
    """Raised when an image can't be used for face matching. Message is user-facing."""


def warm_up() -> None:
    """Load the model once at startup so the first request isn't slow."""
    DeepFace.build_model(FACE_MODEL)


def download_image(url: str) -> Image.Image:
    if urlparse(url).scheme not in ("http", "https"):
        raise FaceError("Image must be an http(s) URL")
    try:
        resp = requests.get(url, timeout=DOWNLOAD_TIMEOUT, stream=True)
    except requests.RequestException as exc:
        raise FaceError(f"Could not download image: {exc}") from exc
    if resp.status_code != 200:
        raise FaceError(f"Could not download image (HTTP {resp.status_code})")

    data = resp.raw.read(MAX_IMAGE_BYTES + 1, decode_content=True)
    if len(data) > MAX_IMAGE_BYTES:
        raise FaceError("Image is too large")
    try:
        # Converting to RGB normalises PNG/WebP/AVIF/greyscale into one format.
        return Image.open(BytesIO(data)).convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise FaceError("File is not a readable image") from exc


def embed_image(img: Image.Image) -> list[float]:
    """Return the embedding of the largest face in the image.

    Raises FaceError if no face is detected. Previously the code used
    enforce_detection=False, which silently embedded the whole photo
    (background, clothes...) when no face was found and produced
    meaningless match scores.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        img.save(tmp.name, "JPEG", quality=95)
        path = tmp.name
    try:
        reps = DeepFace.represent(
            img_path=path,
            model_name=FACE_MODEL,
            detector_backend=FACE_DETECTOR,
            enforce_detection=True,
            align=True,
        )
    except ValueError as exc:
        raise FaceError(
            "No face detected. Please upload a clear, front-facing photo."
        ) from exc
    finally:
        os.remove(path)

    def area(rep):
        fa = rep.get("facial_area") or {}
        return fa.get("w", 0) * fa.get("h", 0)

    return list(map(float, max(reps, key=area)["embedding"]))


def embed_url(url: str) -> list[float]:
    return embed_image(download_image(url))


def cosine_distance(a, b) -> float:
    a = np.asarray(a, dtype=np.float64)
    b = np.asarray(b, dtype=np.float64)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 2.0
    return float(1.0 - np.dot(a, b) / denom)


def confidence_from_distance(distance: float) -> int:
    """Map cosine distance to a 0-100 score shown in the UI (= cosine similarity %)."""
    return int(round(max(0.0, min(1.0, 1.0 - distance)) * 100))
