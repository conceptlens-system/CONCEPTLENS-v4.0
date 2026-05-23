from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List
from app.core.database import get_database
from app.models.schemas import ProfessorRequest, ProfessorRequestCreate, Institution
from app.core.security import get_current_user
from bson import ObjectId

router = APIRouter()

@router.post("/request-access", response_model=ProfessorRequest, status_code=201)
async def request_access(request: ProfessorRequestCreate):
    db = await get_database()
    
    # Check if request already exists
    existing = await db.professor_requests.find_one({"email": request.email, "status": "PENDING"})
    if existing:
        raise HTTPException(status_code=400, detail="Request already pending for this email.")
        
    # Check if user already exists
    user = await db.users.find_one({"email": request.email})
    if user:
         raise HTTPException(status_code=400, detail="User with this email already exists.")

    req_dict = request.dict()
    req_dict["status"] = "PENDING"
    from datetime import datetime, timezone
    req_dict["created_at"] = datetime.now(timezone.utc)
    
    result = await db.professor_requests.insert_one(req_dict)
    
    created = await db.professor_requests.find_one({"_id": result.inserted_id})
    created["_id"] = str(created["_id"])
    return created

@router.get("/requests", response_model=List[ProfessorRequest])
async def list_requests(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    db = await get_database()
    cursor = db.professor_requests.find({"status": "PENDING"})
    requests = await cursor.to_list(length=100)
    for r in requests:
        r["_id"] = str(r["_id"])
    return requests

# Admin endpoint to approve (Mock implementation for now, or real via admin panel)
@router.post("/requests/{request_id}/approve")
async def approve_request(request_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    db = await get_database()
    try:
        oid = ObjectId(request_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    req = await db.professor_requests.find_one({"_id": oid})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if req["status"] != "PENDING":
        raise HTTPException(status_code=400, detail=f"Request is {req['status']}")
        
    # Handle new institution creation if requested
    # As per new requirements, we just store the manually entered Institute name on the User Profile
    institution_id = None
    if req.get("new_institution_name"):
        # We optionally create an institution record for admin visibility
        new_inst = {
            "name": req["new_institution_name"],
            "type": req.get("purpose", "College"), # Dynamic purpose
            "location": f"{req.get('city', '')}, {req.get('country', '')}".strip(", "),
            "city": req.get("city"),
            "country": req.get("country"),
            "domains": [],
            "subscription_status": "Active",
            "joined_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
        }
        inst_result = await db.institutions.insert_one(new_inst)
        institution_id = str(inst_result.inserted_id)

    # Create User
    from app.core.security import get_password_hash
    # Generate random temp password or handle via email (mocking simple hash here)
    # Since prompt says "Admin reviews request", we assume Admin sets it or system generates.
    # We will create user as Professor.
    
    user_dict = {
        "email": req["email"],
        "full_name": req["full_name"],
        "hashed_password": None, # Admin approves, Professor sets via Forgot Password
        "role": "professor",
        "institution_id": institution_id,
        "institute_name": req.get("new_institution_name"),
        "country": req.get("country"),
        "city": req.get("city"),
        "department": req.get("department", ""),
        "subjects": [req.get("subject_expertise")] if req.get("subject_expertise") else [],
        "designation": req.get("designation"),
        "employee_id": req.get("employee_id"),
        "additional_info": req.get("additional_info"),
        "linkedin_url": req.get("linkedin_url"),
        "auth_provider": "local",
        "is_active": True
    }
    
    await db.users.insert_one(user_dict)
    await db.professor_requests.update_one({"_id": oid}, {"$set": {"status": "APPROVED"}})
    
    return {"message": "Professor approved and user created. They should use forgot password to set their access credentials."}

@router.post("/", status_code=201)
async def create_professor(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    # Direct admin creation
    db = await get_database()
    
    # Check email
    if await db.users.find_one({"email": data["email"]}):
        raise HTTPException(status_code=400, detail="User already exists")
        
    from app.core.security import get_password_hash
    user_dict = {
        "email": data["email"],
        "full_name": data["full_name"],
        "hashed_password": get_password_hash(data["password"]),
        "role": "professor",
        "institution_id": data["institution_id"],
        "department": data.get("department", ""),
        "subjects": [],
        "auth_provider": "local",
        "is_active": True
    }
    await db.users.insert_one(user_dict)
    return {"message": "Professor created"}

@router.get("/", response_model=List[dict])
async def list_users(role: str = None, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    db = await get_database()
    query = {}
    if role:
        query["role"] = role
    else:
        # If no role specified, exclude admin by default or return all. Up to you. Let's return all.
        pass
        
    cursor = db.users.find(query)
    users = await cursor.to_list(length=100)
    for u in users:
        u["_id"] = str(u["_id"])
        # Remove hashed password from response
        if "hashed_password" in u:
            del u["hashed_password"]
    return users

@router.delete("/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    db = await get_database()
    try:
        oid = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Check if user exists
    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Optional: Check for dependencies (classes, etc.)?
    # For now, just delete the user.
    
    result = await db.users.delete_one({"_id": oid})
    
    return {"message": "User deleted"}
