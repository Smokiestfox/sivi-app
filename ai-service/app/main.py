from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="SiVi AI Service", version="0.1.0")


class TextPayload(BaseModel):
    title: str = ""
    body: str = ""
    attachment_text: str = ""


class ModerateRequest(BaseModel):
    post_id: str | None = None
    comment_id: str | None = None
    content_type: Literal["post", "comment"] = "post"
    revision: int = 1
    text: TextPayload
    policy_version: str = "moderation-v1"


class ModerateResponse(BaseModel):
    tags: list[str] = Field(default_factory=list)
    scores: dict[str, float] = Field(default_factory=dict)
    model_version: str
    extraction_status: Literal["complete", "partial", "failed"] = "complete"


@app.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/v1/moderate", response_model=ModerateResponse)
async def moderate(payload: ModerateRequest) -> ModerateResponse:
    # TODO: load Laya Multilingual and map questions/scores here.
    # Skeleton intentionally fails closed instead of returning a fake "passed".
    raise HTTPException(
        status_code=503,
        detail="Laya model chưa được cấu hình. Xem ai-service/README.md.",
    )
