# SiVi AI service

FastAPI service độc lập cho AI moderation.

## Chạy local

~~~bash
cd ai-service
uv sync
uv run uvicorn app.main:app --reload --port 8100
~~~

Health check:

~~~bash
curl http://127.0.0.1:8100/health
~~~

## Trạng thái

- /health đã có.
- /v1/moderate là skeleton, hiện trả 503 vì chưa load Laya.
- Không trả kết quả giả trong production.

## Việc cần làm

1. Load Laya Multilingual bằng Python.
2. Nhận state + questions, trả tags + scores.
3. Thêm timeout/retry ở phía Next.js.
4. Không quyết định approved/rejected trong AI service; policy engine nằm ở Next.js.
