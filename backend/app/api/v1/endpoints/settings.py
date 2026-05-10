from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from app.core.database import get_database
from app.core.security import get_current_user
from datetime import datetime

router = APIRouter()

class GlobalSettings(BaseModel):
    ai_features_enabled: bool = True
    maintenance_mode: bool = False
    maintenance_type: str = "instant"
    maintenance_start: str = None
    maintenance_end: str = None
    max_upload_size_mb: int = 10
    system_notification: str = ""

@router.get("/public", response_model=Dict[str, Any])
async def get_public_settings():
    """
    Get public platform settings like announcements and maintenance mode.
    Accessible without authentication.
    """
    db = await get_database()
    settings = await db["global_settings"].find_one({"_id": "global_config"})
    security = await db["system_settings"].find_one({"_id": "security"})
    
    system_notification = settings.get("system_notification", "") if settings else ""
    
    scheduled_maintenance_info = ""
    maintenance_start = None
    maintenance_end = None
    maintenance_type = security.get("maintenance_type", "instant") if security else "instant"
    maintenance_mode = security.get("maintenance_mode", False) if security else False
    
    # Only return info if maintenance mode is enabled and it's scheduled
    if maintenance_mode and maintenance_type == "scheduled":
        start_str = security.get("maintenance_start")
        end_str = security.get("maintenance_end")
        if start_str and end_str:
            try:
                from datetime import timezone, timedelta
                start_time = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
                end_time = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
                now = datetime.utcnow()
                if start_time.tzinfo:
                    now = now.replace(tzinfo=timezone.utc)
                
                maintenance_start = start_str
                maintenance_end = end_str
                
                # Format in IST
                ist_offset = timedelta(hours=5, minutes=30)
                start_ist = start_time + ist_offset
                end_ist = end_time + ist_offset
                start_fmt = start_ist.strftime("%I:%M %p on %b %d")
                end_fmt = end_ist.strftime("%I:%M %p on %b %d")
                scheduled_maintenance_info = f"Scheduled Maintenance: The platform will be offline from {start_fmt} to {end_fmt} (IST)."
                
                # Check if end time has passed, if so disable maintenance automatically
                if now > end_time:
                     maintenance_mode = False
                     await db["system_settings"].update_one(
                         {"_id": "security"},
                         {"$set": {"maintenance_mode": False}}
                     )
            except Exception:
                pass

    return {
        "system_notification": system_notification,
        "scheduled_maintenance_info": scheduled_maintenance_info,
        "maintenance_mode": maintenance_mode,
        "maintenance_type": maintenance_type,
        "maintenance_start": maintenance_start,
        "maintenance_end": maintenance_end
    }

@router.get("/", response_model=Dict[str, Any])
async def get_settings(current_user: dict = Depends(get_current_user)):
    """
    Get global platform settings. Only Admin can view full config,
    but we might expose a public version later. For now, admin only.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    settings = await db["global_settings"].find_one({"_id": "global_config"})
    security = await db["system_settings"].find_one({"_id": "security"})
    
    if not settings:
        # Default settings if none exist
        settings = GlobalSettings().dict()
        settings["_id"] = "global_config"
        settings["updated_at"] = datetime.utcnow()
        await db["global_settings"].insert_one(settings)
        
    if security:
        settings["maintenance_mode"] = security.get("maintenance_mode", False)
        settings["maintenance_type"] = security.get("maintenance_type", "instant")
        settings["maintenance_start"] = security.get("maintenance_start")
        settings["maintenance_end"] = security.get("maintenance_end")
        
    return settings

@router.put("/", response_model=Dict[str, Any])
async def update_settings(
    settings_in: GlobalSettings,
    current_user: dict = Depends(get_current_user)
):
    """
    Update global platform settings. Admin only.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db = await get_database()
    
    update_data = {
        "ai_features_enabled": settings_in.ai_features_enabled,
        "max_upload_size_mb": settings_in.max_upload_size_mb,
        "system_notification": settings_in.system_notification,
        "updated_at": datetime.utcnow()
    }
    
    await db["global_settings"].update_one(
        {"_id": "global_config"},
        {"$set": update_data},
        upsert=True
    )
    
    sec_update = {
        "maintenance_mode": settings_in.maintenance_mode,
        "maintenance_type": settings_in.maintenance_type,
        "maintenance_start": settings_in.maintenance_start,
        "maintenance_end": settings_in.maintenance_end,
    }
    await db["system_settings"].update_one(
        {"_id": "security"},
        {"$set": sec_update},
        upsert=True
    )
    
    return {"message": "Settings updated successfully", "data": update_data}
