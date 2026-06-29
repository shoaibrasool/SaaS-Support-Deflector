import os
from dotenv import load_dotenv

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "support_articles")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "gemini-embedding-2")
VECTOR_SIZE = int(os.getenv("VECTOR_SIZE", "3072"))
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
HYBRID_ALPHA = float(os.getenv("HYBRID_ALPHA", "0.7"))
TOP_K = int(os.getenv("TOP_K", "5"))

MAX_CHUNKS_TO_EMBED = 900
EMBED_DELAY = 0.05
