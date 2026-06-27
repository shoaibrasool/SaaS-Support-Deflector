from fastapi import FastAPI

app = FastAPI(title="SaaS Support Deflector")


@app.get("/health")
def health():
    return {"status": "healthy"}
