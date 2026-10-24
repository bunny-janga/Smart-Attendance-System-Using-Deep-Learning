from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Date, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum
import datetime

class AppRole(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"

class UserRole(Base):
    __tablename__ = "user_roles"
    id = Column(String, primary_key=True, index=True) # Assuming UUID string
    user_id = Column(String, index=True) # Link to auth user (externally managed or internal)
    role = Column(Enum(AppRole), default=AppRole.student)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Admin(Base):
    __tablename__ = "admins"
    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False) # Store hashed password
    full_name = Column(String)
    email = Column(String, unique=True)
    role = Column(Enum(AppRole), default=AppRole.teacher)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AttendanceSettings(Base):
    __tablename__ = "attendance_settings"
    id = Column(String, primary_key=True, index=True)
    attendance_start_time = Column(String, default="09:00") # HH:MM format
    late_threshold_minutes = Column(Integer, default=15) # Minutes after start time
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    updated_by = Column(String, nullable=True) # Admin ID

class AttendancePeriod(Base):
    __tablename__ = "attendance_periods"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)              # e.g. "Period 1", "Morning"
    start_time = Column(String, nullable=False)        # HH:MM
    end_time = Column(String, nullable=False)          # HH:MM
    late_threshold_minutes = Column(Integer, default=10)
    is_active = Column(Integer, default=1)             # 1 = enabled, 0 = disabled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Student(Base):
    __tablename__ = "students"
    id = Column(String, primary_key=True, index=True) # UUID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    name = Column(String, nullable=False)
    student_id = Column(String, unique=True, index=True) # Roll number / ID
    email = Column(String, unique=True, index=True)
    course = Column(String)
    enrollment_date = Column(Date)
    avatar_url = Column(String, nullable=True) # Path to image
    face_encoding = Column(String, nullable=True) # JSON string or path to embedding file? DeepFace works with images mostly or vector DB.
    # user_id = Column(String, nullable=True) # Link to auth user if student can login

    attendance_records = relationship("AttendanceRecord", back_populates="student")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id = Column(String, primary_key=True, index=True) # UUID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    date = Column(Date, nullable=False)
    status = Column(String, default="Present") # Present, Absent, Late
    check_in_time = Column(DateTime(timezone=True), nullable=True)
    confidence = Column(Float, nullable=True)
    is_late = Column(Integer, default=0) # 0 = on-time, 1 = late
    notes = Column(String, nullable=True) # Admin notes
    student_id = Column(String, ForeignKey("students.id"))
    period_id = Column(String, nullable=True)   # FK to attendance_periods (soft link)
    period_name = Column(String, nullable=True) # Denormalised name for display

    student = relationship("Student", back_populates="attendance_records")
