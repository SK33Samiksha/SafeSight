import pytest
from fastapi.testclient import TestClient
from PIL import Image

import routes.found_routes as found_routes
import routes.missing_routes as missing_routes
import utils.embeddings as E
from db import missing_collection
from main import app

COLOURS = {
    "alice": (100, 10, 10),
    "alice2": (98, 12, 9),  # another photo of Alice (very similar embedding)
    "bob": (10, 10, 100),
    "wall": (255, 255, 255),  # no face
}


def fake_download(url):
    return Image.new("RGB", (20, 20), COLOURS[url.rsplit("/", 1)[-1]])


@pytest.fixture(autouse=True)
def setup(monkeypatch):
    monkeypatch.setattr(E, "download_image", fake_download)
    embed = lambda url: E.embed_image(fake_download(url))
    monkeypatch.setattr(found_routes, "embed_url", embed)
    monkeypatch.setattr(missing_routes, "embed_url", embed)
    missing_collection.delete_many({})
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def register(name, image, **extra):
    emb = E.embed_image(fake_download(image))
    missing_collection.insert_one({"name": name, "images": [f"{name}.jpg"], "embeddings": [emb], **extra})


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["threshold"] == 0.40


def test_embeddings_skip_photos_without_a_face(client):
    r = client.post("/api/missing/", json={"images": ["http://x/alice", "http://x/wall"]})
    assert r.status_code == 200
    assert len(r.json()["embeddings"]) == 1
    assert len(r.json()["skipped"]) == 1


def test_registration_refused_when_no_photo_has_a_face(client):
    r = client.post("/api/missing/", json={"images": ["http://x/wall"]})
    assert r.status_code == 422
    assert "No face" in r.json()["detail"]


def test_only_real_matches_are_returned(client):
    """Regression test: the old code returned every person, even at 22%."""
    register("Alice", "http://x/alice")
    register("Bob", "http://x/bob")
    r = client.post("/api/found/", json={"image": "http://x/alice2"})
    assert r.status_code == 200
    names = [m["name"] for m in r.json()["matches"]]
    assert names == ["Alice"]
    assert r.json()["matches"][0]["confidence"] >= 90


def test_found_cases_are_not_matched(client):
    register("Alice", "http://x/alice", status="found")
    r = client.post("/api/found/", json={"image": "http://x/alice2"})
    assert r.json()["matches"] == []


def test_old_records_with_single_embedding_still_match(client):
    emb = E.embed_image(fake_download("http://x/bob"))
    missing_collection.insert_one({"name": "Bob", "images": ["b.jpg"], "embedding": emb})
    r = client.post("/api/found/", json={"image": "http://x/bob"})
    assert [m["name"] for m in r.json()["matches"]] == ["Bob"]


def test_sighting_without_a_face_is_an_error_not_a_fake_success(client):
    r = client.post("/api/found/", json={"image": "http://x/wall"})
    assert r.status_code == 422


def test_distance_and_confidence_helpers():
    assert E.cosine_distance([1, 0], [0, 1]) == pytest.approx(1.0)
    assert E.cosine_distance([1, 2], [2, 4]) == pytest.approx(0.0)
    assert E.confidence_from_distance(0.1) == 90
    assert E.confidence_from_distance(1.5) == 0
