from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_database
from app.core.security import get_current_user
from typing import List
from datetime import datetime

from bson import ObjectId

router = APIRouter()

@router.get("/", response_model=List[dict])
async def read_audit_logs(
    limit: int = 200,
    date: str = None, # format: YYYY-MM-DD
    current_user: dict = Depends(get_current_user),
):
    """
    Get a stream of recent system activities (Admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    
    query = {}
    if date:
        try:
            # Parse 'YYYY-MM-DD' and create a 24-hour window
            target_date = datetime.strptime(date, "%Y-%m-%d")
            end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            query["timestamp"] = {"$gte": target_date, "$lte": end_of_day}
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
            
    # Fetch logs sorted by newest first
    logs = await db["audit_logs"].find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    
    for log in logs:
        for key, value in log.items():
            if isinstance(value, ObjectId):
                log[key] = str(value)
        
    return logs
