import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
import models
import crud
import schemas

# Create all tables
models.Base.metadata.create_all(bind=engine)

# Create session
db = SessionLocal()

try:
    # Check if admin already exists
    existing_admin = db.query(models.Admin).filter(models.Admin.username == "admin").first()
    
    if existing_admin:
        print("Admin user already exists!")
    else:
        # Create default admin
        admin_data = schemas.AdminCreate(
            username="admin4",
            password="admin123",
            email="admin@facecheck.ai",
            full_name="System Administrator"
        )
        
        admin = crud.create_admin(db, admin_data)
        print(f"✅ Admin user created successfully!")
        print(f"Username: admin")
        print(f"Password: admin123")
        print(f"\n⚠️  Please change the password after first login!")
    
    # Initialize default attendance settings
    settings = crud.get_attendance_settings(db)
    print(f"\n✅ Attendance settings initialized:")
    print(f"Start Time: {settings.attendance_start_time}")
    print(f"Late Threshold: {settings.late_threshold_minutes} minutes")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
