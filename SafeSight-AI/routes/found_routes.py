from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from config import MATCH_THRESHOLD, TOP_K
from db import missing_collection
from utils.embeddings import (
    FaceError,
    confidence_from_distance,
    cosine_distance,
    embed_url,
)

router = APIRouter()


class FoundInput(BaseModel):
    image: str


def _person_embeddings(person: dict) -> list:
    """Support both the new `embeddings` list and the old single `embedding`."""
    embs = [e for e in (person.get("embeddings") or []) if e]
    if not embs and person.get("embedding"):
        embs = [person["embedding"]]
    return embs


def find_matches(embedding: list[float]) -> list[dict]:
    projection = {"name": 1, "age": 1, "gender": 1, "images": 1,
                  "lastSeenLocation": 1, "embeddings": 1, "embedding": 1}
    candidates = missing_collection.find({"status": {"$ne": "found"}}, projection)

    matches = []
    for person in candidates:
        embs = _person_embeddings(person)
        if not embs:
            continue
        # Best (smallest) distance across all photos of this person
        distance = min(cosine_distance(embedding, e) for e in embs)

        # Only genuine matches are returned (bug fix: previously every person
        # was appended regardless of score, so 22% "matches" were shown).
        if distance < MATCH_THRESHOLD:
            matches.append({
                "id": str(person["_id"]),
                "name": person.get("name"),
                "age": person.get("age"),
                "gender": person.get("gender"),
                "image": (person.get("images") or [None])[0],
                "lastSeen": person.get("lastSeenLocation"),
                "distance": round(distance, 4),
                "confidence": confidence_from_distance(distance),
            })

    matches.sort(key=lambda m: m["distance"])
    return matches[:TOP_K]


@router.post("/")
async def match_found_person(data: FoundInput):
    try:
        embedding = await run_in_threadpool(embed_url, data.image)
    except FaceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    matches = await run_in_threadpool(find_matches, embedding)
    return {
        "embedding": embedding,
        "matches": matches,
        "threshold": MATCH_THRESHOLD,
    }
