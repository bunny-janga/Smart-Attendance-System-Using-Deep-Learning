from sqlalchemy.orm import Session
from sqlalchemy import func
import models, schemas
import uuid
import datetime
import hashlib

def get_student(db: Session, student_id: str):
    return db.query(models.Student).filter(models.Student.id == student_id).first()

def get_student_by_roll(db: Session, roll_number: str):
    return db.query(models.Student).filter(models.Student.student_id == roll_number).first()

def create_student(db: Session, student: schemas.StudentCreate, face_image_path: str = None):
    # Generate UUID
    db_student = models.Student(
        id=str(uuid.uuid4()),
        name=student.name,
        student_id=student.student_id,
        email=student.email,
        course=student.course,
        enrollment_date=student.enrollment_date,
        avatar_url=face_image_path
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

def get_attendance_settings(db: Session):
    settings = db.query(models.AttendanceSettings).first()
    if not settings:
        # Create default settings
        settings = models.AttendanceSettings(
            id=str(uuid.uuid4()),
            attendance_start_time="09:00",
            late_threshold_minutes=15
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

def mark_attendance(db: Session, student_db_id: str, confidence: float) -> dict:
    """
    Mark attendance for a student.
    Returns a dict:
        {
          "record": AttendanceRecord,
          "already_marked": bool,   # True = duplicate for this period today
          "period_name": str|None
        }
    """
    now = datetime.datetime.now()
    today = now.date()

    # Identify which period this check-in belongs to
    period = get_matching_period(db, now)
    period_id   = period.id   if period else None
    period_name = period.name if period else None

    # ── Per-period duplicate check ──────────────────────────
    if period_id:
        # Student already marked for THIS period today?
        existing = db.query(models.AttendanceRecord).filter(
            models.AttendanceRecord.student_id == student_db_id,
            models.AttendanceRecord.date       == today,
            models.AttendanceRecord.period_id  == period_id
        ).first()
    else:
        # No period configured → fall back to one-per-day rule
        existing = db.query(models.AttendanceRecord).filter(
            models.AttendanceRecord.student_id == student_db_id,
            models.AttendanceRecord.date       == today,
            models.AttendanceRecord.period_id  == None   # noqa: E711
        ).first()

    if existing:
        return {"record": existing, "already_marked": True, "period_name": period_name or "today"}

    # ── Determine late / on-time ────────────────────────────
    if period:
        # Use period's own late threshold
        start_parts       = period.start_time.split(":")
        attendance_start  = datetime.datetime.combine(
            today, datetime.time(int(start_parts[0]), int(start_parts[1]))
        )
        late_cutoff = attendance_start + datetime.timedelta(minutes=period.late_threshold_minutes)
    else:
        # Fall back to global settings
        settings         = get_attendance_settings(db)
        start_parts      = settings.attendance_start_time.split(":")
        attendance_start = datetime.datetime.combine(
            today, datetime.time(int(start_parts[0]), int(start_parts[1]))
        )
        late_cutoff = attendance_start + datetime.timedelta(minutes=settings.late_threshold_minutes)

    is_late = 1 if now > late_cutoff else 0
    status  = "Late" if is_late else "Present"

    # ── Create record ───────────────────────────────────────
    db_attendance = models.AttendanceRecord(
        id            = str(uuid.uuid4()),
        student_id    = student_db_id,
        date          = today,
        check_in_time = now,
        status        = status,
        confidence    = confidence,
        is_late       = is_late,
        period_id     = period_id,
        period_name   = period_name,
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return {"record": db_attendance, "already_marked": False, "period_name": period_name}

def get_attendance_records(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.AttendanceRecord).offset(skip).limit(limit).all()

def get_attendance_with_students(db: Session, date_filter: datetime.date = None):
    query = db.query(models.AttendanceRecord).join(models.Student)
    if date_filter:
        query = query.filter(models.AttendanceRecord.date == date_filter)
    return query.order_by(models.AttendanceRecord.check_in_time.desc()).all()

# Admin functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_admin(db: Session, admin: schemas.AdminCreate):
    db_admin = models.Admin(
        id=str(uuid.uuid4()),
        username=admin.username,
        password_hash=hash_password(admin.password),
        full_name=admin.full_name,
        email=admin.email
    )
    db.add(db_admin)
    db.commit()
    db.refresh(db_admin)
    return db_admin

def verify_admin(db: Session, username: str, password: str):
    admin = db.query(models.Admin).filter(models.Admin.username == username).first()
    if admin and admin.password_hash == hash_password(password):
        return admin
    return None

def update_attendance_settings(db: Session, settings: schemas.AttendanceSettingsCreate, admin_id: str):
    db_settings = db.query(models.AttendanceSettings).first()
    if not db_settings:
        db_settings = models.AttendanceSettings(id=str(uuid.uuid4()))
        db.add(db_settings)
    
    db_settings.attendance_start_time = settings.attendance_start_time
    db_settings.late_threshold_minutes = settings.late_threshold_minutes
    db_settings.updated_by = admin_id
    db.commit()
    db.refresh(db_settings)
    return db_settings

def update_attendance_record(db: Session, record_id: str, update_data: schemas.AttendanceUpdate):
    record = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.id == record_id).first()
    if not record:
        return None
    
    if update_data.status:
        record.status = update_data.status
    if update_data.is_late is not None:
        record.is_late = update_data.is_late
    if update_data.notes is not None:
        record.notes = update_data.notes
    
    db.commit()
    db.refresh(record)
    return record

def get_attendance_stats(db: Session, date_filter: datetime.date = None):
    if not date_filter:
        date_filter = datetime.date.today()
    
    total_students = db.query(func.count(models.Student.id)).scalar() or 0
    present_today = db.query(func.count(models.AttendanceRecord.id)).filter(
        models.AttendanceRecord.date == date_filter,
        models.AttendanceRecord.status.in_(["Present", "Late"])
    ).scalar() or 0
    
    late_today = db.query(func.count(models.AttendanceRecord.id)).filter(
        models.AttendanceRecord.date == date_filter,
        models.AttendanceRecord.is_late == 1
    ).scalar() or 0
    
    absent_today = total_students - present_today
    attendance_rate = (present_today / total_students * 100) if total_students > 0 else 0
    
    return {
        "total_students": total_students,
        "present_today": present_today,
        "late_today": late_today,
        "absent_today": absent_today,
        "attendance_rate": round(attendance_rate, 2)
    }

# ── Attendance Period CRUD ──────────────────────────────────
def get_periods(db: Session):
    return db.query(models.AttendancePeriod).order_by(models.AttendancePeriod.start_time).all()

def create_period(db: Session, data: schemas.AttendancePeriodCreate):
    period = models.AttendancePeriod(
        id=str(uuid.uuid4()),
        name=data.name,
        start_time=data.start_time,
        end_time=data.end_time,
        late_threshold_minutes=data.late_threshold_minutes,
        is_active=data.is_active,
    )
    db.add(period)
    db.commit()
    db.refresh(period)
    return period

def update_period(db: Session, period_id: str, data: schemas.AttendancePeriodUpdate):
    period = db.query(models.AttendancePeriod).filter(models.AttendancePeriod.id == period_id).first()
    if not period:
        return None
    if data.name            is not None: period.name = data.name
    if data.start_time      is not None: period.start_time = data.start_time
    if data.end_time        is not None: period.end_time = data.end_time
    if data.late_threshold_minutes is not None: period.late_threshold_minutes = data.late_threshold_minutes
    if data.is_active       is not None: period.is_active = data.is_active
    db.commit()
    db.refresh(period)
    return period

def delete_period(db: Session, period_id: str):
    period = db.query(models.AttendancePeriod).filter(models.AttendancePeriod.id == period_id).first()
    if not period:
        return False
    db.delete(period)
    db.commit()
    return True

def get_matching_period(db: Session, check_time: datetime.datetime):
    """Return the active period that contains check_time, or None."""
    time_str = check_time.strftime("%H:%M")
    periods = db.query(models.AttendancePeriod).filter(
        models.AttendancePeriod.is_active == 1
    ).all()
    for p in periods:
        if p.start_time <= time_str <= p.end_time:
            return p
    return None

