import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("src.main:app", host=host, port=port, reload=True)
