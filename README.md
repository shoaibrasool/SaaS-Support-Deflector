# SaaS Support Deflector

Hybrid search over Notion knowledge base articles to deflect support tickets — 70% semantic (Gemini Embedding 2) + 30% keyword (BM25).

## Stack

| Component | Tech |
|---|---|
| API | FastAPI (`localhost:8001`) |
| Vector DB | Qdrant (`localhost:6333`, Docker) |
| Embeddings | `gemini-embedding-2` via Google Gen AI SDK |
| Search | Hybrid (dense + sparse) with Qdrant |

## Quick Start

### 1. Start Qdrant

```bash
docker compose up -d qdrant
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Set your API key

Create a `.env` file (a template is provided):

```
GOOGLE_API_KEY=your-key-here
```

Get a free key from [Google AI Studio](https://aistudio.google.com/).

### 4. Ingest data

Embed the article chunks and upload to Qdrant:

```bash
python -m src.ingest
```

### 5. Start the API server

```bash
python run.py
```

## Project Structure

```
├── run.py                  # FastAPI entrypoint
├── src/
│   ├── config.py           # Environment config + rate-limit constants
│   ├── data_loader.py      # Article loading & chunking
│   ├── embedding.py        # Gemini Embedding 2 service
│   ├── ingest.py           # CLI ingestion pipeline
│   ├── main.py             # FastAPI app
│   ├── models.py           # Pydantic schemas
│   └── qdrant_service.py   # Qdrant collection & upsert
└── data/
    └── articles.json       # Notion knowledge base articles
```

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `GET /health` | GET | Health check |
| `GET /articles/count` | GET | Total loaded articles |
| `POST /search` | POST | Hybrid search (planned) |
| `GET /categories` | GET | Distinct categories (planned) |

## Notes

- Uses `gemini-embedding-2` with document prefix `"title: {title} | text: {body}"` — no `task_type` parameter (unsupported in v2).
- Chunks are split by article headings, targeting 380–420 tokens each.
- Qdrant point IDs are deterministic integer hashes (`md5("article_id:chunk_index") % 2^63`), safe for re-ingestion.
