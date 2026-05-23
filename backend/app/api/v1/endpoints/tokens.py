from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user
from app.core.database import get_database
from datetime import datetime
from bson import ObjectId

router = APIRouter()

@router.get("/me")
async def get_my_tokens(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    
    # Fetch fresh user data to ensure up-to-date tokens
    user = await db["users"].find_one({"_id": ObjectId(current_user["_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    role = user.get("role", "student")
    daily_limit = user.get("daily_token_limit")
    if daily_limit is None:
        daily_limit = 100 if role == "professor" else 15

    tokens_used = user.get("tokens_used", 0)
    token_last_reset = user.get("token_last_reset")

    today = datetime.utcnow().strftime("%Y-%m-%d")

    # Check for reset
    if token_last_reset != today:
        tokens_used = 0
        token_last_reset = today

    return {
        "tokens_used": tokens_used,
        "daily_limit": daily_limit,
        "remaining": max(0, daily_limit - tokens_used),
        "last_reset": token_last_reset,
        "tier": role
    }
