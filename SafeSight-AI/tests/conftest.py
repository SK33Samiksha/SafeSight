"""Test setup: a fake face model and an in-memory MongoDB.

The real DeepFace/TensorFlow stack is large and slow to load, so the tests
replace it with a tiny fake that turns an image's colour into an "embedding".
This tests SafeSight's own logic (thresholds, ranking, error handling), not FaceNet.
"""
import os
import sys
import types
from pathlib import Path

import mongomock
import pymongo

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ.setdefault("MONGO_URI", "mongodb://test")
os.environ["MATCH_THRESHOLD"] = "0.40"
pymongo.MongoClient = mongomock.MongoClient


class FakeDeepFace:
    @staticmethod
    def build_model(name):
        return None

    @staticmethod
    def represent(img_path, **kwargs):
        from PIL import Image

        r, g, b = Image.open(img_path).convert("RGB").getpixel((0, 0))
        if r > 200 and g > 200 and b > 200:  # a white image stands for "no face"
            raise ValueError("Face could not be detected")
        return [{"embedding": [r + 1, g + 1, b + 1, 1.0], "facial_area": {"w": 10, "h": 10}}]


sys.modules["deepface"] = types.SimpleNamespace(DeepFace=FakeDeepFace)
