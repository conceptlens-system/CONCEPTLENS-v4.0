from fastapi import HTTPException, status
from datetime import datetime
from bson import ObjectId

async def check_and_deduct_tokens(user: dict, db, required_tokens: int = 1):
    role = user.get("role", "student")
    # Default limits
    daily_limit = user.get("daily_token_limit")
    if daily_limit is None:
        daily_limit = 100 if role == "professor" else 15

    tokens_used = user.get("tokens_used", 0)
    token_last_reset = user.get("token_last_reset")
    lifetime_tokens_used = user.get("lifetime_tokens_used", 0)

    today = datetime.utcnow().strftime("%Y-%m-%d")

    # Reset if new day
    if token_last_reset != today:
        tokens_used = 0
        token_last_reset = today

    # Check limit
    if tokens_used + required_tokens > daily_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API token are over wait until re-stores"
        )

    # Deduct (meaning increment used)
    new_tokens_used = tokens_used + required_tokens
    new_lifetime = lifetime_tokens_used + required_tokens

    # Update in DB
    await db["users"].update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {
            "daily_token_limit": daily_limit,
            "tokens_used": new_tokens_used,
            "token_last_reset": token_last_reset,
            "lifetime_tokens_used": new_lifetime
        }}
    )
    
    return True
