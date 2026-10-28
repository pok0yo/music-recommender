"""Read-only discovery API: no training or external metadata calls in requests."""

from contextlib import asynccontextmanager
import json
import logging
import os
from pathlib import Path
import time
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import psycopg
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.catalog import Catalog
from backend.schemas import CatalogResponse, ErrorResponse, Meta, RecommendationResponse
from ml.serving_artifact import Artifact

MODEL_SHA = "ac341968aef80dc9f5eb9459eea5e5ba119e9112c9b2dc38026dda00bc92f122"
logger = logging.getLogger("music_api")


def create_app(catalog=None, artifact=None, release=None, origins=(), rate_limit=60):
    @asynccontextmanager
    async def lifespan(app):
        app.state.catalog, app.state.artifact, app.state.release = catalog, artifact, release
        app.state.catalog_verified = False
        try:
            if app.state.artifact is None:
                app.state.artifact = Artifact(os.getenv("MODEL_DIRECTORY", "artifacts/stage-7-cf-v1"),
                    os.getenv("MODEL_MANIFEST_SHA256", MODEL_SHA))
            if app.state.release is None:
                app.state.release = json.loads(Path(os.getenv("CATALOG_RELEASE", "data/processed/catalog-expansion-v2/release.json")).read_text(encoding="utf-8"))
            if app.state.catalog is None:
                dsn = os.getenv("DATABASE_URL")
                if not dsn:
                    dsn = json.loads(Path("artifacts/local-postgres/connections.json").read_text())["reader"]
                app.state.catalog = Catalog(dsn, app.state.release)
        except (OSError, ValueError, KeyError):
            logger.error("release_load_failed")
        yield

    app = FastAPI(title="Music discovery API", version="1.0.0", lifespan=lifespan,
        responses={422: {"model": ErrorResponse}, 429: {"model": ErrorResponse},
            500: {"model": ErrorResponse}, 503: {"model": ErrorResponse}})
    app.add_middleware(CORSMiddleware, allow_origins=list(origins), allow_methods=["GET"],
        allow_headers=["Content-Type"], expose_headers=["X-Request-ID"], allow_credentials=False)
    buckets = {}

    @app.middleware("http")
    async def operational(request, call_next):
        request.state.request_id = str(uuid4())
        started = time.monotonic()
        peer = request.client.host if request.client else "unknown"
        if not request.url.path.startswith("/health/"):
            now = time.monotonic()
            for key in list(buckets):
                if now - buckets[key][0] >= 60:
                    del buckets[key]
            if peer not in buckets and len(buckets) >= 1024:
                response = failure(request, 429, "rate_limited", "Please retry later.", {"Retry-After": "60"})
            else:
                bucket = buckets.setdefault(peer, [now, 0])
                bucket[1] += 1
                response = None if bucket[1] <= rate_limit else failure(request, 429,
                    "rate_limited", "Please retry later.", {"Retry-After": str(max(1, int(60 - now + bucket[0])))})
        else:
            response = None
        if response is None:
            response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        route = request.scope.get("route")
        logger.info("request_id=%s route=%s status=%s duration_ms=%.2f", request.state.request_id,
            route.path if route else "unmatched", response.status_code, (time.monotonic()-started)*1000)
        return response

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request, error):
        messages = {404: ("not_found", "Recording is outside this serving catalog."),
            422: ("invalid_input", "Check the request parameters."),
            503: ("unavailable", "Music discovery is temporarily unavailable.")}
        code, message = messages.get(error.status_code, ("request_failed", "The request could not be completed."))
        return failure(request, error.status_code, code, message)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, error):
        return failure(request, 422, "invalid_input", "Check the request parameters.")

    @app.exception_handler(psycopg.Error)
    async def database_error(request, error):
        return failure(request, 503, "unavailable", "Music discovery is temporarily unavailable.")

    @app.exception_handler(Exception)
    async def unexpected_error(request, error):
        logger.error("request_failed request_id=%s", request.state.request_id)
        return failure(request, 500, "internal_error", "The request could not be completed.")

    def ensure_ready(request: Request):
        state = request.app.state
        try:
            if state.artifact is None or state.catalog is None or state.release is None:
                raise ValueError("Missing release")
            if (state.release["model_manifest_sha256"] != os.getenv("MODEL_MANIFEST_SHA256", MODEL_SHA)
                    or state.release["catalog_version"] != state.catalog.release["catalog_version"]):
                raise ValueError("Incompatible release")
            state.catalog.check(full=not state.catalog_verified)
            state.catalog_verified = True
        except (psycopg.Error, ValueError, KeyError):
            state.catalog_verified = False
            raise HTTPException(503) from None
        return state

    def parameters(request, allowed):
        keys = list(request.query_params.keys())
        if set(keys)-set(allowed) or any(len(request.query_params.getlist(key)) != 1 for key in keys):
            raise HTTPException(422)

    def meta(state):
        return Meta(model_version=state.artifact.manifest["model_id"],
            catalog_version=state.release["catalog_version"],
            artifact_schema_version=state.artifact.manifest["schema_version"],
            data_mode=state.release["data_mode"])

    @app.get("/health/live")
    def live():
        return {"status": "live"}

    @app.get("/health/ready")
    def ready(state=Depends(ensure_ready)):
        return {"status": "ready", "meta": meta(state)}

    @app.get("/v1/catalog/search", response_model=CatalogResponse)
    def search(request: Request, q: str = Query(min_length=2, max_length=200),
            limit: int = Query(default=10, ge=1, le=20), state=Depends(ensure_ready)):
        parameters(request, ("q", "limit"))
        q = q.strip()
        if len(q) < 2:
            raise HTTPException(422)
        return dict(results=state.catalog.search(q, limit), meta=meta(state))

    @app.get("/v1/catalog/starters", response_model=CatalogResponse)
    def starters(request: Request, state=Depends(ensure_ready)):
        parameters(request, ())
        return dict(results=state.catalog.starters(), meta=meta(state))

    @app.get("/v1/recommendations/{recording_id}", response_model=RecommendationResponse,
        responses={404: {"model": ErrorResponse}})
    def recommend(recording_id: UUID, request: Request,
            limit: int = Query(default=10, ge=1, le=10), state=Depends(ensure_ready)):
        parameters(request, ("limit",))
        recording = str(recording_id)
        seed = state.catalog.get(recording)
        if seed is None:
            raise HTTPException(404)
        ranked = state.artifact.recommend(recording)["items"][:limit]
        tracks = state.catalog.get_many([item["recording_mbid"] for item in ranked]) if ranked else {}
        results = []
        for rank, item in enumerate(ranked, 1):
            track = tracks.get(item["recording_mbid"])
            if track:
                results.append(dict(**track, rank=rank, shared_training_listeners=item["shared_training_listeners"],
                    seed_training_listeners=item["seed_training_listeners"],
                    candidate_training_listeners=item["candidate_training_listeners"]))
        return dict(seed=seed, results=results, alternatives=[], requested_limit=limit,
            model_result_count=len(ranked), omitted_metadata_count=len(ranked)-len(results),
            status="no_connections" if not ranked else "ok" if len(results)==limit else "limited", meta=meta(state))

    return app


def failure(request, status, code, message, headers=None):
    return JSONResponse(status_code=status, content=dict(code=code, message=message,
        request_id=request.state.request_id), headers={"X-Request-ID": request.state.request_id, **(headers or {})})


app = create_app(origins=tuple(filter(None, os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","))))
