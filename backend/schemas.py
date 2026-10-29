"""Bounded, documented HTTP contracts for the discovery service."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, AwareDatetime


class ArtistCredit(BaseModel):
    name: str = Field(min_length=1)
    artist_id: UUID
    joinphrase: str = ""


class ListeningLink(BaseModel):
    model_config=ConfigDict(extra='forbid')
    provider: Literal['spotify','apple_music','youtube_music']
    url: str = Field(max_length=2048)
    verified_at: AwareDatetime
    verification: Literal['recording_relationship_and_destination']

    @field_validator('url')
    @classmethod
    def approved_destination(cls,value,info):
        from backend.listening_links import destination
        parsed=destination(value)
        if not parsed or parsed[0]!=info.data.get('provider'):raise ValueError('Invalid listening destination')
        return parsed[2]


class Track(BaseModel):
    model_config = ConfigDict(extra="forbid")
    recording_id: UUID
    canonical_recording_id: UUID
    title: str = Field(min_length=1)
    artist_credits: list[ArtistCredit] = Field(min_length=1)
    disambiguation: str | None
    external_link: None = None
    listening_links: list[ListeningLink] = Field(default_factory=list,max_length=3)

    @field_validator('listening_links')
    @classmethod
    def unique_providers(cls,value):
        if len({link.provider for link in value})!=len(value):raise ValueError('Duplicate listening provider')
        return value


class Meta(BaseModel):
    model_version: str
    catalog_version: str
    artifact_schema_version: int
    training_cutoff: Literal["2026-08-01T00:00:00Z"] = "2026-08-01T00:00:00Z"
    method: Literal["item_cosine_shared_listener_shrinkage"] = "item_cosine_shared_listener_shrinkage"
    data_mode: Literal["real", "demo"]


class CatalogResponse(BaseModel):
    results: list[Track]
    meta: Meta


class RelatedTrack(Track):
    rank: int = Field(ge=1, le=10)
    reason_code: Literal["shared_listeners"] = "shared_listeners"
    explanation: str = "Connected through shared listening in this dataset."
    shared_training_listeners: int = Field(ge=3)
    seed_training_listeners: int = Field(ge=5)
    candidate_training_listeners: int = Field(ge=5)


class RecommendationResponse(BaseModel):
    seed: Track
    results: list[RelatedTrack]
    alternatives: list[Track] = Field(default_factory=list)
    status: Literal["ok", "limited", "no_connections"]
    omitted_metadata_count: int = Field(ge=0, le=10)
    model_result_count: int = Field(ge=0, le=10)
    requested_limit: int = Field(ge=1, le=10)
    meta: Meta


class ErrorResponse(BaseModel):
    code: str
    message: str
    request_id: UUID
