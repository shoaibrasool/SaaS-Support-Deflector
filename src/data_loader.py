import json
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

    print(f"Loaded {len(articles)} articles from {file_path}")
    return articles


if __name__ == "__main__":
    load_articles()
