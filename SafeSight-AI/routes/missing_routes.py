from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from utils.embeddings import FaceError, embed_url

router = APIRouter()


class MissingInput(BaseModel):
    images: list[str] = Field(..., min_length=1, max_length=10)


@router.post("/")
async def generate_embeddings(data: MissingInput):
    """Return one embedding per usable photo of a missing person.

    Photos without a detectable face are skipped and reported back. If none of
    the photos has a face the request fails, so the person is never stored
    without an embedding (which would make them impossible to match).
    """
    embeddings, skipped = [], []
    for url in data.images:
        try:
            embeddings.append(await run_in_threadpool(embed_url, url))
        except FaceError as exc:
            skipped.append({"image": url, "reason": str(exc)})

    if not embeddings:
        reason = skipped[0]["reason"] if skipped else "No usable photo"
        raise HTTPException(status_code=422, detail=reason)

    return {"embeddings": embeddings, "skipped": skipped}
