from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.core.database import get_database
from app.core.security import get_current_user
from datetime import datetime, timezone
import calendar
from bson import ObjectId

router = APIRouter()

@router.get("/metrics", response_model=Dict[str, Any])
async def get_admin_metrics(current_user: dict = Depends(get_current_user)):
    """
    Get system-wide historical metrics for Admin Analytics Dashboard.
    Requires Admin privileges.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    current_date = datetime.now(timezone.utc)
    
    # Initialize the last 6 months keys and structures
    months_keys = []
    for i in range(5, -1, -1):
        m = current_date.month - i
        y = current_date.year
        while m <= 0:
            m += 12
            y -= 1
        months_keys.append((y, m))
        
    start_y, start_m = months_keys[0]
    
    def is_before_window(dt):
        if dt.year < start_y:
            return True
        if dt.year == start_y and dt.month < start_m:
            return True
        return False

    def get_date_from_doc(doc, date_field="created_at"):
        if date_field in doc and isinstance(doc[date_field], datetime):
            return doc[date_field]
        if "_id" in doc and isinstance(doc["_id"], ObjectId):
            return doc["_id"].generation_time
        return None

    counts = {
        "Users": {key: 0 for key in months_keys},
        "Institutions": {key: 0 for key in months_keys},
        "Exams": {key: 0 for key in months_keys},
        "Classes": {key: 0 for key in months_keys}
    }
    
    running_totals = {
        "Users": 0,
        "Institutions": 0,
        "Exams": 0,
        "Classes": 0
    }
    
    async def process_collection(collection_name, doc_type, date_field="created_at"):
        cursor = db[collection_name].find({}, {"_id": 1, date_field: 1})
        docs = await cursor.to_list(length=10000)
        for doc in docs:
            dt = get_date_from_doc(doc, date_field)
            if dt:
                # Ensure dt is timezone aware
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if is_before_window(dt):
                    running_totals[doc_type] += 1
                else:
                    key = (dt.year, dt.month)
                    if key in counts[doc_type]:
                        counts[doc_type][key] += 1

    await process_collection("users", "Users")
    await process_collection("institutions", "Institutions", "joined_at")
    await process_collection("exams", "Exams")
    await process_collection("classes", "Classes")

    adoption_data = []
    platform_usage = []
    
    for key in months_keys:
        y, m = key
        month_name = f"{calendar.month_abbr[m]} {y}"
        
        running_totals["Users"] += counts["Users"][key]
        running_totals["Institutions"] += counts["Institutions"][key]
        running_totals["Exams"] += counts["Exams"][key]
        running_totals["Classes"] += counts["Classes"][key]
        
        adoption_data.append({
            "name": month_name,
            "Users": running_totals["Users"],
            "Institutions": running_totals["Institutions"]
        })
        
        # Absolute monthly usage for the bar chart
        platform_usage.append({
            "name": month_name,
            "Exams Created": counts["Exams"][key],
            "Active Classes": counts["Classes"][key]
        })

    return {
        "adoption_rates": adoption_data,
        "platform_usage": platform_usage
    }
