from fastapi import FastAPI

from .data_loader import Article, load_articles

app = FastAPI(title="SaaS Support Deflector")

articles: list[Article] = []


@app.on_event("startup")
def startup_event():
    global articles
    articles = load_articles()
    print(f"All data loaded: {len(articles)} articles")


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/articles/count")
def articles_count():
    return {"count": len(articles)}
