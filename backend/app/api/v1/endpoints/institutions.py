from fastapi import APIRouter, HTTPException, Body, Depends
from typing import List
from app.models.schemas import Institution, InstitutionCreate
from app.core.database import get_database

router = APIRouter()

@router.get("/", response_model=List[Institution])
async def list_institutions():
    db = await get_database()
    institutions = await db.institutions.find().to_list(1000)
    return institutions

@router.post("/", response_model=Institution)
async def create_institution(institution: InstitutionCreate):
    db = await get_database()
    inst_dict = institution.model_dump()
    new_inst = await db.institutions.insert_one(inst_dict)
    created_inst = await db.institutions.find_one({"_id": new_inst.inserted_id})
    return created_inst

@router.delete("/{id}")
async def delete_institution(id: str):
    from bson import ObjectId
    db = await get_database()
    result = await db.institutions.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Institution not found")
    return {"status": "deleted"}

@router.put("/{id}", response_model=Institution)
async def update_institution(id: str, institution: InstitutionCreate):
    from bson import ObjectId
    db = await get_database()
    inst_dict = institution.model_dump()
    result = await db.institutions.update_one(
        {"_id": ObjectId(id)},
        {"$set": inst_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Institution not found")
    updated_inst = await db.institutions.find_one({"_id": ObjectId(id)})
    return updated_inst
