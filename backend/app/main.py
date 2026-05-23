from fastapi import FastAPI
from app.api.v1.api import api_router
from app.core.database import connect_to_mongo, close_mongo_connection
from app.core.cors import setup_cors

app = FastAPI(
    title="CONCEPTLENS API",
    description="Backend for ConceptLens Education Analytics Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Setup CORS
setup_cors(app)

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Welcome to CONCEPTLENS API", "status": "active"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_msg = traceback.format_exc()
    print("########## BACKEND ERROR ##########")
    print(error_msg)
    print("###################################")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error. Please contact support."},
    )
# Uvicorn reload trigger comment