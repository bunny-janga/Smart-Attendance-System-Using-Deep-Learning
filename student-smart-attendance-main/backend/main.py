from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
import crud, models, schemas, database
from deepface import DeepFace
import shutil
import os
import uuid
from datetime import date
import logging

from fastapi.staticfiles import StaticFiles

# Setup Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Tables
models.Base.metadata.create_all(bind=database.engine)

# ── Safe schema migrations ─────────────────────────────────
# SQLite's CREATE_ALL won't ALTER existing tables, so we handle it manually.
def _run_migrations():
    with database.engine.connect() as conn:
        from sqlalchemy import text

        # Get existing columns in attendance_records
        result = conn.execute(text("PRAGMA table_info(attendance_records)"))
        existing_cols = {row[1] for row in result.fetchall()}  # row[1] = column name

        if "period_id" not in existing_cols:
            conn.execute(text("ALTER TABLE attendance_records ADD COLUMN period_id VARCHAR"))
            logger.info("Migration: added period_id to attendance_records")

        if "period_name" not in existing_cols:
            conn.execute(text("ALTER TABLE attendance_records ADD COLUMN period_name VARCHAR"))
            logger.info("Migration: added period_name to attendance_records")

        conn.commit()

try:
    _run_migrations()
except Exception as e:
    logger.warning(f"Migration warning (non-fatal): {e}")

app = FastAPI()


# Ensure Dataset Directory Exists
DATASET_PATH = "dataset"
os.makedirs(DATASET_PATH, exist_ok=True)

# Mount static files
app.mount("/dataset", StaticFiles(directory="dataset"), name="dataset")

# CORS
origins = [
    "http://localhost:5173", # Vite default
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Ensure Dataset Directory Exists
DATASET_PATH = "dataset"
os.makedirs(DATASET_PATH, exist_ok=True)

@app.post("/students/", response_model=schemas.Student)
async def register_student(
    name: str = Form(...),
    student_id: str = Form(...),
    email: str = Form(...),
    course: str = Form(...),
    enrollment_date: date = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Check if student exists
    existing_student = crud.get_student_by_roll(db, student_id)
    if existing_student:
        raise HTTPException(status_code=400, detail="Student already registered")

    # Save Image
    # Naming convention: {student_id}_{uuid}.jpg to avoid collisions and allow existing DeepFace find
    # DeepFace find returns the filename. We need to map filename back to student.
    # Actually DeepFace.find expects a db_path (folder).
    
    file_extension = file.filename.split(".")[-1]
    filename = f"{student_id}.{file_extension}"
    file_path = os.path.join(DATASET_PATH, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create DB Entry
    student_data = schemas.StudentCreate(
        name=name,
        student_id=student_id,
        email=email,
        course=course,
        enrollment_date=enrollment_date
    )
    
    # We might want to remove the file if validation fails, but here we assume success
    # Ideally verify face is detected before saving?
    try:
        # Check if face is detectable
        DeepFace.extract_faces(img_path=file_path)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"No face detected in the image: {str(e)}")

    return crud.create_student(db=db, student=student_data, face_image_path=file_path)

@app.post("/attendance/mark")
async def mark_attendance(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Save temp file
    temp_filename = f"temp_{uuid.uuid4()}.jpg"
    temp_path = temp_filename
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Run DeepFace Find
        # This searches the 'dataset' folder for a match
        try:
            dfs = DeepFace.find(img_path=temp_path, db_path=DATASET_PATH, silent=True)
        except ValueError:
             raise HTTPException(status_code=400, detail="No face detected in the frame")

        if len(dfs) == 0:
            raise HTTPException(status_code=404, detail="No match found")
            
        df = dfs[0]
        
        if df.empty:
             raise HTTPException(status_code=404, detail="No match found")
        
        # Get best match
        # identity column contains the path to the file in dataset, e.g. "dataset/123.jpg"
        best_match_path = df.iloc[0]["identity"]
        
        # Extract ID from filename
        # Expected: dataset/STUDENT_ID.ext
        # We need to handle path separators carefully
        filename = os.path.basename(best_match_path)
        student_roll_id = os.path.splitext(filename)[0]
        
        # Verify metric if needed (DeepFace.find filters by threshold by default)
        distance = df.iloc[0]["distance"]
        confidence = 1 - distance # Rough approximation
        
        # Fetch Student
        student = crud.get_student_by_roll(db, student_roll_id)
        if not student:
            raise HTTPException(status_code=404, detail="Student record not found for matched face")
            
        # Mark Attendance
        result = crud.mark_attendance(db, student.id, confidence)
        record = result["record"]

        if result["already_marked"]:
            period_label = result["period_name"] or "today"
            raise HTTPException(
                status_code=409,
                detail=f"{student.name} has already marked attendance for {period_label}."
            )

        return {
            "message": "Attendance marked",
            "student": student.name,
            "student_id": student.student_id,
            "status": record.status,
            "period": result["period_name"],
            "time": record.check_in_time,
            "confidence": round(confidence * 100, 1)
        }
        
    except HTTPException:
        raise  # Let 404 / 409 / 400 pass through as-is
    except Exception as e:
        logger.error(f"Error checking attendance: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/students")
def read_students(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    students = db.query(models.Student).offset(skip).limit(limit).all()
    # Manually serialize to avoid Pydantic failures on null timestamps
    return [
        {
            "id":              s.id,
            "name":            s.name,
            "student_id":      s.student_id,
            "email":           s.email,
            "course":          s.course,
            "enrollment_date": str(s.enrollment_date) if s.enrollment_date else None,
            "avatar_url":      s.avatar_url,
            "created_at":      s.created_at.isoformat() if s.created_at else None,
            "updated_at":      s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in students
    ]

@app.get("/attendance")
def read_attendance(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    records = crud.get_attendance_records(db, skip=skip, limit=limit)
    return [
        {
            "id":            r.id,
            "student_id":    r.student_id or "",
            "date":          str(r.date) if r.date else None,
            "status":        r.status or "Unknown",
            "check_in_time": r.check_in_time.isoformat() if r.check_in_time else None,
            "confidence":    r.confidence,
            "is_late":       r.is_late if r.is_late is not None else 0,
            "notes":         r.notes,
            "created_at":    r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]

@app.post("/attendance/mark-multiple")
async def mark_multiple_attendance(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Mark attendance for multiple students in one image"""
    temp_filename = f"temp_multi_{uuid.uuid4()}.jpg"
    temp_path = temp_filename
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Extract all faces from the image
        try:
            faces = DeepFace.extract_faces(img_path=temp_path, enforce_detection=True)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"No faces detected in the image: {str(e)}")
        
        if len(faces) == 0:
            raise HTTPException(status_code=400, detail="No faces detected in the image")
        
        results = []
        marked_count = 0
        
        # Process each detected face
        for idx, face_data in enumerate(faces):
            try:
                # Save individual face temporarily
                face_temp_path = f"temp_face_{uuid.uuid4()}.jpg"
                
                # Get the face image and save it
                import cv2
                import numpy as np
                face_img = face_data["face"]
                # Convert to uint8 if needed
                if face_img.max() <= 1.0:
                    face_img = (face_img * 255).astype(np.uint8)
                cv2.imwrite(face_temp_path, cv2.cvtColor(face_img, cv2.COLOR_RGB2BGR))
                
                # Try to find match for this face
                try:
                    dfs = DeepFace.find(img_path=face_temp_path, db_path=DATASET_PATH, silent=True)
                    
                    if len(dfs) > 0 and not dfs[0].empty:
                        df = dfs[0]
                        best_match_path = df.iloc[0]["identity"]
                        filename = os.path.basename(best_match_path)
                        student_roll_id = os.path.splitext(filename)[0]
                        distance = df.iloc[0]["distance"]
                        confidence = 1 - distance
                        
                        # Fetch Student
                        student = crud.get_student_by_roll(db, student_roll_id)
                        if student:
                            # Mark Attendance (period-aware)
                            result = crud.mark_attendance(db, student.id, confidence)
                            record = result["record"]

                            if result["already_marked"]:
                                results.append({
                                    "success": False,
                                    "already_marked": True,
                                    "student_id": student.student_id,
                                    "student_name": student.name,
                                    "period": result["period_name"],
                                    "error": f"Already marked for {result['period_name'] or 'today'}"
                                })
                            else:
                                marked_count += 1
                                results.append({
                                    "success": True,
                                    "student_id": student.student_id,
                                    "student_name": student.name,
                                    "confidence": round(confidence * 100, 1),
                                    "time": record.check_in_time,
                                    "status": record.status,
                                    "period": result["period_name"],
                                    "already_marked": False
                                })
                        else:
                            results.append({
                                "success": False,
                                "error": "Student record not found",
                                "face_number": idx + 1
                            })
                    else:
                        results.append({
                            "success": False,
                            "error": "No match found",
                            "face_number": idx + 1
                        })
                except Exception as match_error:
                    results.append({
                        "success": False,
                        "error": f"Error matching face: {str(match_error)}",
                        "face_number": idx + 1
                    })
                finally:
                    if os.path.exists(face_temp_path):
                        os.remove(face_temp_path)
                        
            except Exception as face_error:
                results.append({
                    "success": False,
                    "error": f"Error processing face: {str(face_error)}",
                    "face_number": idx + 1
                })
        
        return {
            "total_faces_detected": len(faces),
            "attendance_marked": marked_count,
            "results": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in multi-face attendance: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

# Admin endpoints
@app.post("/admin/register")
def register_admin(admin: schemas.AdminCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Admin).filter(models.Admin.username == admin.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    return crud.create_admin(db, admin)

@app.post("/admin/login")
def login_admin(credentials: schemas.AdminLogin, db: Session = Depends(get_db)):
    admin = crud.verify_admin(db, credentials.username, credentials.password)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"message": "Login successful", "admin_id": admin.id, "username": admin.username, "role": admin.role}

@app.get("/admin/stats")
def get_stats(date: str = None, db: Session = Depends(get_db)):
    try:
        import datetime as dt
        date_filter = dt.datetime.strptime(date, "%Y-%m-%d").date() if date else dt.date.today()
        stats = crud.get_attendance_stats(db, date_filter)
        return stats
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    return stats

@app.get("/admin/attendance")
def get_admin_attendance(date: str = None, db: Session = Depends(get_db)):
    import datetime as dt
    date_filter = dt.datetime.strptime(date, "%Y-%m-%d").date() if date else None
    records = crud.get_attendance_with_students(db, date_filter)
    
    result = []
    for record in records:
        result.append({
            "id": record.id,
            "date": str(record.date),
            "check_in_time": record.check_in_time,
            "status": record.status,
            "is_late": record.is_late,
            "confidence": record.confidence,
            "notes": record.notes,
            "student": {
                "id": record.student.id,
                "name": record.student.name,
                "student_id": record.student.student_id,
                "email": record.student.email,
                "course": record.student.course
            }
        })
    return result

@app.put("/admin/attendance/{record_id}")
def update_attendance(record_id: str, update: schemas.AttendanceUpdate, db: Session = Depends(get_db)):
    record = crud.update_attendance_record(db, record_id, update)
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return {"message": "Attendance updated", "record": record}

@app.get("/admin/settings", response_model=schemas.AttendanceSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    return crud.get_attendance_settings(db)

@app.put("/admin/settings")
def update_settings(settings: schemas.AttendanceSettingsCreate, admin_id: str = "admin", db: Session = Depends(get_db)):
    return crud.update_attendance_settings(db, settings, admin_id)

# ── Attendance Period Endpoints ────────────────────────────
@app.get("/admin/periods")
def list_periods(db: Session = Depends(get_db)):
    periods = crud.get_periods(db)
    return [
        {
            "id":                     p.id,
            "name":                   p.name,
            "start_time":             p.start_time,
            "end_time":               p.end_time,
            "late_threshold_minutes": p.late_threshold_minutes,
            "is_active":              p.is_active,
            "created_at":             p.created_at.isoformat() if p.created_at else None,
        }
        for p in periods
    ]

@app.post("/admin/periods")
def create_period(data: schemas.AttendancePeriodCreate, db: Session = Depends(get_db)):
    return crud.create_period(db, data)

@app.put("/admin/periods/{period_id}")
def update_period(period_id: str, data: schemas.AttendancePeriodUpdate, db: Session = Depends(get_db)):
    period = crud.update_period(db, period_id, data)
    if not period:
        raise HTTPException(status_code=404, detail="Period not found")
    return period

@app.delete("/admin/periods/{period_id}")
def delete_period(period_id: str, db: Session = Depends(get_db)):
    ok = crud.delete_period(db, period_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Period not found")
    return {"message": "Period deleted"}

@app.get("/students/{student_id}")
def get_student_detail(student_id: str, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Fetch attendance records for this student
    attendance_records = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.student_id == student_id
    ).order_by(models.AttendanceRecord.date.desc()).all()

    total = len(attendance_records)
    present = sum(1 for r in attendance_records if r.status in ["Present", "Late"])
    late = sum(1 for r in attendance_records if r.status == "Late")
    attendance_rate = round((present / total * 100), 2) if total > 0 else 0

    return {
        "id": student.id,
        "name": student.name,
        "student_id": student.student_id,
        "email": student.email,
        "course": student.course,
        "enrollment_date": str(student.enrollment_date),
        "avatar_url": student.avatar_url,
        "created_at": student.created_at,
        "stats": {
            "total_records": total,
            "present": present,
            "late": late,
            "absent": total - present,
            "attendance_rate": attendance_rate,
        },
        "attendance_records": [
            {
                "id": r.id,
                "date": str(r.date),
                "check_in_time": r.check_in_time,
                "status": r.status,
                "is_late": r.is_late,
                "confidence": round(r.confidence * 100, 1) if r.confidence else None,
                "notes": r.notes,
            }
            for r in attendance_records
        ]
    }

@app.put("/students/{student_id}")
def update_student(student_id: str, update: schemas.StudentUpdate, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check uniqueness of student_id (roll number) — skip if unchanged
    if update.student_id and update.student_id != student.student_id:
        conflict = db.query(models.Student).filter(
            models.Student.student_id == update.student_id
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Student ID already taken by another student")

    # Check uniqueness of email — skip if unchanged
    if update.email and update.email != student.email:
        conflict = db.query(models.Student).filter(
            models.Student.email == update.email
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Email already registered to another student")

    if update.name is not None:
        student.name = update.name
    if update.student_id is not None:
        student.student_id = update.student_id
    if update.email is not None:
        student.email = update.email
    if update.course is not None:
        student.course = update.course
    if update.enrollment_date is not None:
        student.enrollment_date = update.enrollment_date

    db.commit()
    db.refresh(student)
    return student

@app.delete("/students/{student_id}")
def delete_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Delete face image
    if student.avatar_url and os.path.exists(student.avatar_url):
        os.remove(student.avatar_url)
    
    db.delete(student)
    db.commit()
    return {"message": "Student deleted"}
