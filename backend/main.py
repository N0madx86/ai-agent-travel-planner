import asyncio
import sys

# Must be set before any event loop starts for Playwright to work on Windows in FastAPI
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting AI Travel Planner...")
    await init_db()
    print("Database initialized")
    if settings.OPENROUTER_API_KEY:
        print("OpenRouter (gpt-4o-mini) initialized as primary AI")
    yield
    # Shutdown
    print("Shutting down...")

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description="AI-powered travel planning with Ollama",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "name": settings.API_TITLE,
        "version": settings.API_VERSION,
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Import routers
from app.api import hotels, trips, itineraries, images

app.include_router(hotels.router, prefix="/api/hotels", tags=["Hotels"])
app.include_router(trips.router, prefix="/api/trips", tags=["Trips"])
app.include_router(itineraries.router, prefix="/api/itineraries", tags=["Itineraries"])
app.include_router(images.router, prefix="/api/images", tags=["Images"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )
