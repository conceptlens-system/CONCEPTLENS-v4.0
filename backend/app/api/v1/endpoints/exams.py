from fastapi import APIRouter, HTTPException, Body, Depends
from typing import List
from app.core.database import get_database
from app.models.exams import Exam, ExamCreate
from app.core.security import get_current_user
from bson import ObjectId
from datetime import datetime, timezone
from app.models.notifications import Notification

router = APIRouter()

def ensure_utc(exam_doc):
    if exam_doc.get("schedule_start") and exam_doc["schedule_start"].tzinfo is None:
        exam_doc["schedule_start"] = exam_doc["schedule_start"].replace(tzinfo=timezone.utc)
    if exam_doc.get("exam_access_end_time") and exam_doc["exam_access_end_time"].tzinfo is None:
        exam_doc["exam_access_end_time"] = exam_doc["exam_access_end_time"].replace(tzinfo=timezone.utc)
    if exam_doc.get("created_at") and exam_doc["created_at"].tzinfo is None:
        exam_doc["created_at"] = exam_doc["created_at"].replace(tzinfo=timezone.utc)
    return exam_doc

@router.get("/", response_model=List[Exam])
async def list_exams(professor_id: str = None, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    query = {}
    
    if current_user["role"] == "professor":
        query["professor_id"] = str(current_user["_id"])
    elif current_user["role"] == "student":
        enrollments = await db.class_students.find({"student_id": current_user["email"]}).to_list(100)
        class_ids = [e["class_id"] for e in enrollments]
        query["class_ids"] = {"$in": class_ids}
        now_utc = datetime.now(timezone.utc)
        query["$or"] = [
            {"is_validated": True},
            {"scheduled_exam_publish_time": {"$lte": now_utc}}
        ]
    else:
        if professor_id:
             query["professor_id"] = professor_id
        
    cursor = db.exams.find(query).sort("created_at", -1)
    exams = await cursor.to_list(length=100)
    
    # If student, check for attempts
    if current_user["role"] == "student":
        student_id = current_user.get("email") # or _id depending on what is stored in responses
        exam_ids = [str(e["_id"]) for e in exams]
        
        # simple check: distinct assessment_ids for this student
        attempts = await db.student_responses.distinct("assessment_id", {"student_id": student_id, "assessment_id": {"$in": exam_ids}})
        attempted_set = set(attempts)
        
        for e in exams:
            e["_id"] = str(e["_id"])
            ensure_utc(e)
            e["attempted"] = e["_id"] in attempted_set
            
            if not e.get("is_validated", False):
                s_exam_time = e.get("scheduled_exam_publish_time")
                if s_exam_time:
                    if isinstance(s_exam_time, str):
                        s_exam_time = datetime.fromisoformat(s_exam_time.replace("Z", "+00:00"))
                    if s_exam_time.tzinfo is None:
                        s_exam_time = s_exam_time.replace(tzinfo=timezone.utc)
                    if datetime.now(timezone.utc) >= s_exam_time:
                        e["is_validated"] = True

            # Dynamic Result Publish Check
            if not e.get("results_published", False):
                s_time = e.get("scheduled_publish_time")
                if s_time:
                    if isinstance(s_time, str):
                        s_time = datetime.fromisoformat(s_time.replace("Z", "+00:00"))
                    if s_time.tzinfo is None:
                        s_time = s_time.replace(tzinfo=timezone.utc)
                    if datetime.now(timezone.utc) >= s_time:
                        e["results_published"] = True
    else:
        for e in exams:
            e["_id"] = str(e["_id"])
            ensure_utc(e)
            if not e.get("is_validated", False):
                s_exam_time = e.get("scheduled_exam_publish_time")
                if s_exam_time:
                    if isinstance(s_exam_time, str):
                        s_exam_time = datetime.fromisoformat(s_exam_time.replace("Z", "+00:00"))
                    if s_exam_time.tzinfo is None:
                        s_exam_time = s_exam_time.replace(tzinfo=timezone.utc)
                    if datetime.now(timezone.utc) >= s_exam_time:
                        e["is_validated"] = True

            # Dynamic Publish Check for Professor/Admin view as well
            if not e.get("results_published", False):
                s_time = e.get("scheduled_publish_time")
                if s_time:
                    if isinstance(s_time, str):
                        s_time = datetime.fromisoformat(s_time.replace("Z", "+00:00"))
                    if s_time.tzinfo is None:
                        s_time = s_time.replace(tzinfo=timezone.utc)
                    if datetime.now(timezone.utc) >= s_time:
                        e["results_published"] = True
            
    return exams

@router.post("/", response_model=Exam)
async def create_exam(exam: ExamCreate, current_user: dict = Depends(get_current_user)):
    print("----- CREATE EXAM ENDPOINT HIT (DEFENSIVE MODE) -----")
    try:
        # 1. Convert to Dict
        new_exam = exam.dict()
        print("Received Payload Keys:", new_exam.keys())

        # 2. Defensive Cleaning (The "500 Killer")
        # Ensure no _id is passed to Mongo (it generates its own)
        if "_id" in new_exam:
            print("Removing leaked _id from payload")
            del new_exam["_id"]
        if "id" in new_exam:
            del new_exam["id"]
            
        # Clean Nested Questions
        if "questions" in new_exam:
            for q in new_exam["questions"]:
                if "_id" in q: del q["_id"]
                # Ensure generic topic if missing
                if "topic_id" not in q or not q["topic_id"]:
                    q["topic_id"] = "general"

        # 3. Set System Fields
        new_exam["professor_id"] = str(current_user["_id"])
        new_exam["is_validated"] = False 
        new_exam["created_at"] = datetime.now(timezone.utc)
        
        # 4. Insert
        print("Inserting sanitized exam into DB...")
        db = await get_database()
        result = await db.exams.insert_one(new_exam)
        print(f"Insertion Success! ID: {result.inserted_id}")
        
        # 5. Retrieve & Return
        created = await db.exams.find_one({"_id": result.inserted_id})
        created["_id"] = str(created["_id"])
        ensure_utc(created)
        
        return created

    except Exception as e:
        import traceback
        print("!!!!! FATAL CREATE EXAM ERROR !!!!!")
        traceback.print_exc()
        # Return 500 but with detail so user sees it
        raise HTTPException(status_code=500, detail=f"Backend Error: {str(e)}")

@router.get("/{exam_id}", response_model=Exam)
async def get_exam(exam_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    exam = await db.exams.find_one({"_id": obj_id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    exam["_id"] = str(exam["_id"])
    ensure_utc(exam)

    # Security: If user is a student, check enrollment and hide answers if results are not published
    if current_user.get("role") == "student":
        # Note: You could also check if student is enrolled in the class here.
        if not exam.get("results_published", False):
            # Check dynamic publish schedule just in case
            s_time = exam.get("scheduled_publish_time")
            if s_time:
                if isinstance(s_time, str):
                    s_time = datetime.fromisoformat(s_time.replace("Z", "+00:00"))
                if s_time.tzinfo is None:
                    s_time = s_time.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) >= s_time:
                    exam["results_published"] = True
            
            if not exam.get("results_published", False):
                # Strip correct answers and explanations
                for q in exam.get("questions", []):
                    q["correct_answer"] = ""
                    q["explanation"] = ""

    return exam

@router.put("/{exam_id}", response_model=Exam)
async def update_exam(exam_id: str, exam: ExamCreate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify ownership
    existing_exam = await db.exams.find_one({"_id": obj_id})
    if not existing_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if existing_exam["professor_id"] != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    # Update with new data
    update_data = exam.dict()
    update_data["professor_id"] = str(current_user["_id"])
    
    await db.exams.update_one(
        {"_id": obj_id},
        {"$set": update_data}
    )
    
    updated = await db.exams.find_one({"_id": obj_id})
    updated["_id"] = str(updated["_id"])
    ensure_utc(updated)
    return updated

@router.delete("/{exam_id}")
async def delete_exam(exam_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify ownership
    existing_exam = await db.exams.find_one({"_id": obj_id})
    if not existing_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if existing_exam["professor_id"] != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    await db.exams.delete_one({"_id": obj_id})
    
    return {"message": "Exam deleted successfully"}

@router.patch("/{exam_id}/validate", response_model=Exam)
async def validate_exam(exam_id: str, is_validated: bool = Body(..., embed=True), current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify ownership
    existing_exam = await db.exams.find_one({"_id": obj_id})
    if not existing_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if existing_exam["professor_id"] != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    await db.exams.update_one(
        {"_id": obj_id},
        {"$set": {"is_validated": is_validated}}
    )
    
    updated = await db.exams.find_one({"_id": obj_id})
    updated["_id"] = str(updated["_id"])
    ensure_utc(updated)
    ensure_utc(updated)
    return updated

@router.patch("/{exam_id}/schedule_exam_publish", response_model=Exam)
async def schedule_exam_publish(
    exam_id: str, 
    scheduled_time: datetime = Body(..., embed=True), 
    current_user: dict = Depends(get_current_user)
):
    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify ownership
    existing_exam = await db.exams.find_one({"_id": obj_id})
    if not existing_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if existing_exam["professor_id"] != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    # Ensure timezone awareness - IST offset handling typically done on frontend, 
    # but we force UTC here for DB storage if it's naive
    if scheduled_time.tzinfo is None:
        scheduled_time = scheduled_time.replace(tzinfo=timezone.utc)

    # Set the scheduled time and ensure `is_validated` is false so it acts as "Scheduled"
    await db.exams.update_one(
        {"_id": obj_id},
        {"$set": {
            "scheduled_exam_publish_time": scheduled_time,
            "is_validated": False
        }}
    )
    
    updated = await db.exams.find_one({"_id": obj_id})
    updated["_id"] = str(updated["_id"])
    ensure_utc(updated)
    return updated

@router.post("/{exam_id}/publish", response_model=Exam)
async def publish_exam_results(exam_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify ownership
    existing_exam = await db.exams.find_one({"_id": obj_id})
    if not existing_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if existing_exam["professor_id"] != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    # Check End Time
    access_end_time_str = existing_exam.get("exam_access_end_time")
    if access_end_time_str:
        # Since it might be stored as string or datetime
        if isinstance(access_end_time_str, str):
            end_time = datetime.fromisoformat(access_end_time_str.replace("Z", "+00:00"))
        else:
            end_time = access_end_time_str
        
        # Ensure timezone awareness
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)
            
        if datetime.now(timezone.utc) < end_time:
            raise HTTPException(status_code=400, detail="Cannot publish results before the exam has ended.")

    # Update Exam
    await db.exams.update_one(
        {"_id": obj_id},
        {"$set": {"results_published": True}}
    )
    
    updated = await db.exams.find_one({"_id": obj_id})
    updated["_id"] = str(updated["_id"])
    ensure_utc(updated)

    # Calculate and Award XP
    class_ids = existing_exam.get("class_ids", [])
    enable_xp = existing_exam.get("enable_xp", True)
    
    if enable_xp and class_ids:
        # Map Question ID to Marks
        question_marks = {q["id"]: q.get("marks", 1) for q in existing_exam.get("questions", [])}
        
        # Get all responses for this exam
        responses = await db.student_responses.find({"assessment_id": exam_id}).to_list(10000)
        
        # Group by student
        student_scores = {} # student_id -> score
        for r in responses:
            sid = r["student_id"]
            qid = r["question_id"]
            is_correct = r.get("is_correct", False)
            
            if sid not in student_scores:
                student_scores[sid] = 0
            if is_correct:
                student_scores[sid] += question_marks.get(qid, 0)
                
        # Calculate max possible score to determine percentages
        total_possible_score = sum(question_marks.values())

        # Update User Documents
        for sid, score in student_scores.items():
            # 1. Base Scale: 10 XP per Mark
            xp_earned = score * 10
            
            # 2. Participation Bonus
            xp_earned += 20
            
            # 3. High Achiever & Perfect Score Bonuses
            if total_possible_score > 0:
                percentage = (score / total_possible_score) * 100
                if percentage == 100:
                    xp_earned += 100
                elif percentage >= 80:
                    xp_earned += 50
                    
            await db.users.update_one(
                {"email": sid},
                {"$inc": {f"class_points.{cls_id}": xp_earned for cls_id in class_ids}}
            )

    # Notify Students (Who have attempted)
    # 1. Find all students who submitted responses (we already have responses above, but distinct is fine)
    distinct_students = await db.student_responses.distinct("student_id", {"assessment_id": exam_id})
    
    notifications = []
    for student_id in distinct_students:
        # Check if notification already exists to avoid spam? No, duplicate publish might be update.
        notif = {
            "recipient_id": student_id,
            "type": "RESULT_PUBLISHED",
            "title": "Exam Results Released",
            "message": f"Results for '{existing_exam['title']}' have been published. Check your marks now.",
            "link": f"/student/exam/{exam_id}/results",
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        }
        notifications.append(notif)
    
    if notifications:
        await db.notifications.insert_many(notifications)
    return updated

@router.patch("/{exam_id}/schedule_publish", response_model=Exam)
async def schedule_publish_results(
    exam_id: str, 
    scheduled_time: datetime = Body(..., embed=True), 
    current_user: dict = Depends(get_current_user)
):
    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify ownership
    existing_exam = await db.exams.find_one({"_id": obj_id})
    if not existing_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if existing_exam["professor_id"] != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    # Ensure timezone awareness for the new scheduled time
    if scheduled_time.tzinfo is None:
        scheduled_time = scheduled_time.replace(tzinfo=timezone.utc)

    # Check against End Time
    access_end_time_str = existing_exam.get("exam_access_end_time")
    if access_end_time_str:
        if isinstance(access_end_time_str, str):
            end_time = datetime.fromisoformat(access_end_time_str.replace("Z", "+00:00"))
        else:
            end_time = access_end_time_str
        
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)
            
        if scheduled_time < end_time:
            raise HTTPException(status_code=400, detail="Scheduled publish time must be after the exam's access end time.")

    # Update Exam Schedule
    await db.exams.update_one(
        {"_id": obj_id},
        {"$set": {"scheduled_publish_time": scheduled_time}}
    )
    
    updated = await db.exams.find_one({"_id": obj_id})
    updated["_id"] = str(updated["_id"])
    ensure_utc(updated)
    return updated

@router.get("/{exam_id}/students", response_model=List[dict])
async def get_exam_students(exam_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify ownership
    existing_exam = await db.exams.find_one({"_id": obj_id})
    if not existing_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if existing_exam["professor_id"] != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    # Get all responses for this exam
    responses = await db.student_responses.find({"assessment_id": exam_id}).to_list(1000)
    
    # Extract unique student emails (assuming student_id is email)
    student_ids = list(set([r["student_id"] for r in responses]))
    
    # Fetch student details (mock or from future users collection if exists, currently just returning email/id)
    # Ideally checking class_students or users collection
    # For now, we return valid data structure for the frontend
    
    students_list = []
    for sid in student_ids:
        # Try to find name from enrollments if possible, else use ID
        name = sid.split("@")[0] if "@" in sid else sid
        students_list.append({
            "id": sid,
            "name": name, 
            "email": sid,
            "status": "Completed"
        })
        
    return students_list

@router.get("/{exam_id}/students_scores", response_model=List[dict])
async def get_exam_students_scores(exam_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Verify ownership
    existing_exam = await db.exams.find_one({"_id": obj_id})
    if not existing_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if existing_exam["professor_id"] != str(current_user["_id"]):
         raise HTTPException(status_code=403, detail="Access denied")

    # Map Question ID to Marks
    question_marks = {q["id"]: q.get("marks", 1) for q in existing_exam.get("questions", [])}
    total_marks = sum(question_marks.values())

    # Get all responses for this exam
    responses = await db.student_responses.find({"assessment_id": exam_id}).to_list(10000)
    
    # Group by student
    student_scores = {} # student_id -> score
    
    for r in responses:
        sid = r["student_id"]
        qid = r["question_id"]
        is_correct = r.get("is_correct", False)
        
        if sid not in student_scores:
            student_scores[sid] = 0
            
        if is_correct:
            student_scores[sid] += question_marks.get(qid, 0)
    
    # Format output
    result_list = []
    for sid, score in student_scores.items():
        # Clean ID/Name
        name = sid.split("@")[0] if "@" in sid else sid
        
        result_list.append({
            "id": sid,
            "name": name, 
            "email": sid,
            "score": score,
            "total_marks": total_marks,
            "status": "Completed"
        })
        
    return result_list

@router.get("/{exam_id}/my_result")
async def get_my_result(exam_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
         raise HTTPException(status_code=403, detail="Only students can view their results")

    db = await get_database()
    try:
        obj_id = ObjectId(exam_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Get Exam
    existing_exam = await db.exams.find_one({"_id": obj_id})
    if not existing_exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Dynamic Publish Check
    is_published = existing_exam.get("results_published", False)
    if not is_published:
        scheduled_time_str = existing_exam.get("scheduled_publish_time")
        if scheduled_time_str:
            if isinstance(scheduled_time_str, str):
                s_time = datetime.fromisoformat(scheduled_time_str.replace("Z", "+00:00"))
            else:
                s_time = scheduled_time_str
            if s_time.tzinfo is None:
                s_time = s_time.replace(tzinfo=timezone.utc)
                
            if datetime.now(timezone.utc) >= s_time:
                is_published = True
                
                # Auto-Publish Background Action (Optional, but good for data consistency and XP awarding)
                # Since we don't have a background worker, the first student checking results triggers the actual "Publish"
                # To prevent blocking the student's request significantly, we could ideally spawn a background task.
                # Since we must be fast, we run the publish script synchronously if they are the first to hit this.
                try:
                    await publish_exam_results(exam_id=exam_id, current_user={"_id": ObjectId(existing_exam["professor_id"])})
                except Exception as e:
                    print(f"Auto-publish failed during dynamic check: {e}")
                    pass # Continue serving results even if XP awarding fails this exact moment

    # Check if results published
    if not is_published:
        raise HTTPException(status_code=403, detail="Results not yet published")

    # Calculate Score
    student_id = current_user["email"]
    
    question_marks = {q["id"]: q.get("marks", 1) for q in existing_exam.get("questions", [])}
    total_marks = sum(question_marks.values())
    
    responses = await db.student_responses.find({
        "assessment_id": exam_id, 
        "student_id": student_id
    }).to_list(1000)
    
    score = 0
    correct_count = 0
    
    for r in responses:
        qid = r["question_id"]
        is_correct = r.get("is_correct", False)
        if is_correct:
            score += question_marks.get(qid, 0)
            correct_count += 1
            
    # Create Response Map
    response_map = {r["question_id"]: r for r in responses}
    
    detailed_questions = []
    for q in existing_exam.get("questions", []):
        qid = q["id"]
        response = response_map.get(qid)
        
        q_data = {
            "id": qid,
            "text": q["text"],
            "type": q.get("type", "mcq"),
            "options": q.get("options", []),
            "marks": q.get("marks", 1),
            "correct_answer": q.get("correct_answer"),
            "user_answer": response.get("response_text") if response else None,
            "is_correct": response.get("is_correct", False) if response else False,
            "explanation": q.get("explanation"),
            "topic": q.get("topic_id", "General")
        }
        detailed_questions.append(q_data)
            
    return {
        "score": score,
        "total_marks": total_marks,
        "correct_questions": correct_count,
        "total_questions": len(existing_exam.get("questions", [])),
        "responses_count": len(responses),
        "questions": detailed_questions,
        "subject_id": existing_exam.get("subject_id")
    }
