import json
import re
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, Field, ValidationError


class Article(BaseModel):
    id: str
    title: str
    url: str
    category: str
    category_slug: str
    body: str
    headings: List[str] = Field(default_factory=list)
    word_count: int


class ArticleChunk(BaseModel):
    article_id: str
    chunk_index: int
    title: str
    url: str
    heading: Optional[str] = None
    category: str
    category_slug: str
    body_chunk: str
    body_preview: str
    word_count: int


article_chunks: List[ArticleChunk] = []


def estimate_token_count(text: str) -> int:
    try:
        import tiktoken
    except ImportError:
        return max(1, len(re.findall(r"\w+|[^\w\s]", text)))

    encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text))


def _split_text_into_chunks(text: str, max_tokens: int = 420, target_tokens: int = 380) -> List[str]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return []

    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", cleaned) if part.strip()]
    if not paragraphs:
        return [cleaned]

    chunks: List[str] = []
    current_chunk: List[str] = []
    current_tokens = 0

    def flush_current() -> None:
        nonlocal current_chunk, current_tokens
        if current_chunk:
            chunks.append("\n\n".join(current_chunk).strip())
            current_chunk = []
            current_tokens = 0

    for paragraph in paragraphs:
        paragraph_tokens = estimate_token_count(paragraph)
        if paragraph_tokens > max_tokens:
            flush_current()
            words = paragraph.split()
            if words:
                temp_words: List[str] = []
                temp_tokens = 0
                for word in words:
                    word_tokens = max(1, estimate_token_count(word))
                    if temp_words and temp_tokens + word_tokens > max_tokens:
                        chunks.append(" ".join(temp_words))
                        temp_words = [word]
                        temp_tokens = word_tokens
                    else:
                        temp_words.append(word)
                        temp_tokens += word_tokens
                if temp_words:
                    chunks.append(" ".join(temp_words))
            continue

        if current_chunk and current_tokens + paragraph_tokens > max_tokens:
            flush_current()

        if current_chunk and current_tokens + paragraph_tokens <= target_tokens:
            current_chunk.append(paragraph)
            current_tokens += paragraph_tokens
        else:
            if current_chunk:
                flush_current()
            current_chunk = [paragraph]
            current_tokens = paragraph_tokens

    flush_current()
    return [chunk for chunk in chunks if chunk]


def chunk_article(article: Article, target_tokens: int = 380, max_tokens: int = 420) -> List[ArticleChunk]:
    heading_sections: List[tuple[Optional[str], str]] = []
    normalized_headings = [heading.strip() for heading in article.headings if heading and heading.strip()]

    if normalized_headings:
        body_lines = article.body.splitlines()
        current_heading: Optional[str] = None
        current_lines: List[str] = []

        for line in body_lines:
            stripped_line = line.strip()
            if not stripped_line:
                if current_heading is not None and current_lines:
                    current_lines.append("")
                continue

            if stripped_line in normalized_headings:
                if current_heading is not None and current_lines:
                    heading_sections.append((current_heading, "\n".join(current_lines).strip()))
                current_heading = stripped_line
                current_lines = []
                continue

            if current_heading is None:
                current_heading = article.title

            current_lines.append(stripped_line)

        if current_heading is not None and current_lines:
            heading_sections.append((current_heading, "\n".join(current_lines).strip()))
    else:
        heading_sections = [(None, article.body.strip())]

    if not heading_sections:
        heading_sections = [(None, article.body.strip())]

    chunks: List[ArticleChunk] = []
    for heading, section_text in heading_sections:
        if not section_text.strip():
            continue

        section_chunks = _split_text_into_chunks(section_text, max_tokens=max_tokens, target_tokens=target_tokens)
        if not section_chunks:
            section_chunks = [section_text.strip()]

        for chunk_index, chunk_text in enumerate(section_chunks):
            title = f"{article.title}: {heading}" if heading else article.title
            chunk = ArticleChunk(
                article_id=article.id,
                chunk_index=chunk_index,
                title=title,
                url=article.url,
                heading=heading,
                category=article.category,
                category_slug=article.category_slug,
                body_chunk=chunk_text,
                body_preview=chunk_text[:160],
                word_count=len(chunk_text.split()),
            )
            chunks.append(chunk)

    return chunks


def chunk_articles(articles: List[Article], target_tokens: int = 380, max_tokens: int = 420) -> List[ArticleChunk]:
    chunked: List[ArticleChunk] = []
    for article in articles:
        chunked.extend(chunk_article(article, target_tokens=target_tokens, max_tokens=max_tokens))
    return chunked


def load_articles(file_path: Optional[Path | str] = None) -> List[Article]:
    if file_path is None:
        root = Path(__file__).resolve().parent.parent
        file_path = root / "data" / "articles.json"
    file_path = Path(file_path)

    if not file_path.exists():
        raise FileNotFoundError(f"Articles file not found: {file_path}")

    with file_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    if not isinstance(data, list):
        raise ValueError(f"Expected a list of articles in {file_path}, got {type(data).__name__}")

    articles: List[Article] = []
    errors = []
    for index, item in enumerate(data):
        try:
            articles.append(Article(**item))
        except ValidationError as exc:
            errors.append((index, exc))

    if errors:
        message_lines = [
            f"Article validation failed for {len(errors)} item(s):"
        ]
        for index, exc in errors:
            message_lines.append(f"- item {index}: {exc}")
        raise ValueError("\n".join(message_lines))

    global article_chunks
    article_chunks = chunk_articles(articles)
    print(f"Loaded {len(articles)} articles from {file_path} and generated {len(article_chunks)} chunks")
    return articles


def get_article_chunks() -> List[ArticleChunk]:
    return article_chunks


if __name__ == "__main__":
    load_articles()
