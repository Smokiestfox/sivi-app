from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_reports_service_ready() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_moderation_fails_closed_until_model_is_configured() -> None:
    response = client.post(
        "/v1/moderate",
        json={"content_type": "post", "text": {"title": "Sample post"}},
    )

    assert response.status_code == 503
