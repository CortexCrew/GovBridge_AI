from fastapi import FastAPI
from routes import router

app = FastAPI(
    title="GovBridge AI Service",
    version="1.0"
)

app.include_router(router)

@app.get("/")
def home():
    return {"message": "GovBridge AI Running"}