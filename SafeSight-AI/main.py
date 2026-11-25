from contextlib import asynccontextmanager

from fastapi import FastAPI

from config import FACE_MODEL, MATCH_THRESHOLD
from routes import found_routes, missing_routes
from utils.embeddings import warm_up


@asynccontextmanager
async def lifespan(_app: FastAPI):
    warm_up()
    yield


app = FastAPI(title="SafeSight AI service", lifespan=lifespan)

app.include_router(missing_routes.router, prefix="/api/missing", tags=["missing"])
app.include_router(found_routes.router, prefix="/api/found", tags=["found"])


@app.get("/health")
def health():
    return {"status": "ok", "model": FACE_MODEL, "threshold": MATCH_THRESHOLD}
