from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from fastapi import FastAPI

class ForceCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.method == "OPTIONS":
            response = JSONResponse(content={"message": "Preflight OK"})
        else:
            try:
                response = await call_next(request)
            except Exception as exc:
                print(f"Middleware caught error: {exc}")
                response = JSONResponse(status_code=500, content={"detail": str(exc)})

        # Dynamically allow the requesting origin
        origin = request.headers.get("origin")
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
        
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response

def setup_cors(app: FastAPI):
    app.add_middleware(ForceCORSMiddleware)
