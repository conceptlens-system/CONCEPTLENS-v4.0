from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from app.core.database import get_database
from app.core.security import get_current_user
from bson import ObjectId

router = APIRouter()

@router.get("/class/{class_id}", response_model=List[Dict[str, Any]])
async def get_class_leaderboard(
    class_id: str,
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Fetch the top students specifically enrolled in a given class."""
    try:
        db = await get_database()
        
        # First verify the class exists
        class_doc = await db["classes"].find_one({"_id": ObjectId(class_id)})
        if not class_doc:
            raise HTTPException(status_code=404, detail="Class not found")
            
        # Fetch enrolled students
        enrollments = await db["class_students"].find({"class_id": class_id}).to_list(1000)
        if not enrollments:
            return []
            
        student_emails = [e["student_id"] for e in enrollments]

        pipeline = [
            {"$match": {
                "email": {"$in": student_emails},
                "role": "student"
            }},
            {"$sort": {f"class_points.{class_id}": -1}},
            {"$limit": limit},
            {"$project": {
                "_id": {"$toString": "$_id"},
                "full_name": 1,
                "points": {"$ifNull": [f"$class_points.{class_id}", 0]}
            }}
        ]
        
        class_top_students = await db["users"].aggregate(pipeline).to_list(limit)
        return class_top_students

    except Exception as e:
        print(f"Error fetching class leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch leaderboard")
