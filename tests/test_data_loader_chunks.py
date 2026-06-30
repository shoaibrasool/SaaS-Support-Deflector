from pathlib import Path

from src.data_loader import Article, ArticleChunk, chunk_article


def test_chunk_article_creates_chunks_for_headings():
    article = Article(
        id="demo",
        title="Demo article",
        url="https://example.com/demo",
        category="Testing",
        category_slug="testing",
        body="Section one\n\nThis is the first section body.\n\nSection two\n\nThis is the second section body.",
        headings=["Section one", "Section two"],
        word_count=12,
    )

    chunks = chunk_article(article)

    assert len(chunks) >= 2
    assert all(isinstance(chunk, ArticleChunk) for chunk in chunks)
    assert chunks[0].heading == "Section one"
    assert chunks[0].title.startswith("Demo article")
    assert chunks[0].body_chunk
