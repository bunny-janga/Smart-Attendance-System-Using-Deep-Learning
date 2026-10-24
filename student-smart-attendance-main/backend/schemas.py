from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, time
from uuid import UUID

class StudentBase(BaseModel):
    name: str
    student_id: str
    email: str
    course: str
    enrollment_date: date
    avatar_url: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class Student(StudentBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class AttendanceBase(BaseModel):
    student_id: str
    date: date
    status: str
    check_in_time: Optional[datetime] = None
    confidence: Optional[float] = None
    is_late: Optional[int] = 0
    notes: Optional[str] = None

class AttendanceCreate(AttendanceBase):
    pass

class Attendance(AttendanceBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class AttendanceWithStudent(Attendance):
    student: Student

class AdminBase(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None

class AdminCreate(AdminBase):
    password: str

class Admin(AdminBase):
    id: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class AdminLogin(BaseModel):
    username: str
    password: str

class AttendanceSettingsBase(BaseModel):
    attendance_start_time: str  # HH:MM format
    late_threshold_minutes: int

class AttendanceSettingsCreate(AttendanceSettingsBase):
    pass

class AttendanceSettingsResponse(AttendanceSettingsBase):
    id: str
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AttendanceStats(BaseModel):
    total_students: int
    present_today: int
    late_today: int
    absent_today: int
    attendance_rate: float

class AttendanceUpdate(BaseModel):
    status: Optional[str] = None
    is_late: Optional[int] = None
    notes: Optional[str] = None

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    student_id: Optional[str] = None
    email: Optional[str] = None
    course: Optional[str] = None
    enrollment_date: Optional[date] = None

# ── Attendance Period schemas ───────────────────────────────
class AttendancePeriodBase(BaseModel):
    name: str
    start_time: str          # HH:MM
    end_time: str            # HH:MM
    late_threshold_minutes: int = 10
    is_active: int = 1

class AttendancePeriodCreate(AttendancePeriodBase):
    pass

class AttendancePeriodUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    late_threshold_minutes: Optional[int] = None
    is_active: Optional[int] = None

class AttendancePeriodResponse(AttendancePeriodBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


