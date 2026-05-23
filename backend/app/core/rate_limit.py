import time
from fastapi import Request, HTTPException

# Simple in-memory rate limiter for demo purposes
# In production, use Redis or MongoDB for distributed rate limiting.

class RateLimiter:
    def __init__(self, requests: int, window_seconds: int):
        self.requests = requests
        self.window_seconds = window_seconds
        self.clients = {}

    async def __call__(self, request: Request):
        # Identify client by IP
        client_ip = request.client.host if request.client else "unknown"
        
        current_time = time.time()
        
        # Cleanup old entries
        if client_ip in self.clients:
            self.clients[client_ip] = [timestamp for timestamp in self.clients[client_ip] if current_time - timestamp < self.window_seconds]
        else:
            self.clients[client_ip] = []
            
        if len(self.clients[client_ip]) >= self.requests:
            raise HTTPException(status_code=429, detail="Too Many Requests")
            
        self.clients[client_ip].append(current_time)

# Common limits
login_limiter = RateLimiter(requests=5, window_seconds=60) # 5 attempts per minute
api_limiter = RateLimiter(requests=100, window_seconds=60) # 100 requests per minute
