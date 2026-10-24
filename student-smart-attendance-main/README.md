# Smart Attendance System

AI-powered face recognition attendance system with admin panel, analytics, and automatic late detection.

## 🌟 Features

### Student Features
- ✅ Face recognition-based attendance
- ✅ Student registration with photo capture
- ✅ Real-time attendance marking
- ✅ Dashboard with attendance statistics

### Admin Features
- ✅ Admin dashboard with analytics
- ✅ Configure attendance start time and late threshold
- ✅ Automatic late detection based on time settings
- ✅ Manage and edit attendance records
- ✅ View attendance statistics by date
- ✅ Add notes to attendance records
- ✅ Student management (view, delete)

## Prerequisites

- Python 3.9+
- Node.js 16+
- Webcam for face capture

## 🚀 Quick Start

### 1. Backend Setup

Navigate to the `backend` directory:
```bash
cd backend
```

Activate virtual environment (if not already):
```bash
.venv\Scripts\activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Initialize database and create admin user:
```bash
python init_admin.py
```

Run the server:
```bash
python -m uvicorn main:app --reload
```
The API will be available at `http://localhost:8000`.

### 2. Frontend Setup

Navigate to the `frontend` directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Run the development server:
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

## 📖 Usage Guide

### For Students

1. **Register**:
   - Click "Register" in the sidebar
   - Fill in your details (Name, Student ID, Email, Course)
   - Click "Capture" to take your photo
   - Submit the registration

2. **Mark Attendance**:
   - Go to "Attendance" page
   - Click "Start Scanning"
   - Face the camera
   - System automatically recognizes and marks your attendance

### For Admin/Teachers

1. **Login**:
   - Click "Admin" in the sidebar
   - Default credentials: `admin` / `admin123`
   - **Change password after first login!**

2. **Configure Settings**:
   - Go to Settings
   - Set attendance start time (e.g., 09:00)
   - Set late threshold in minutes (e.g., 15)
   - Students arriving after start time + threshold will be marked late

3. **View Dashboard**:
   - See real-time statistics
   - Total students, present, late, absent
   - Attendance rate percentage
   - Filter by date

4. **Manage Attendance**:
   - View all attendance records
   - Edit status (Present/Late/Absent)
   - Add notes to records
   - Override late markings

## 📁 Directory Structure

```
face_recognition/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── models.py            # Database models
│   ├── schemas.py           # Pydantic schemas
│   ├── crud.py              # Database operations
│   ├── database.py          # Database configuration
│   ├── init_admin.py        # Admin initialization script
│   ├── requirements.txt     # Python dependencies
│   └── dataset/             # Stores student face images
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Dashboard.tsx           # Student dashboard
    │   │   ├── Registration.tsx        # Student registration
    │   │   ├── Attendance.tsx          # Face recognition attendance
    │   │   ├── AdminLogin.tsx          # Admin authentication
    │   │   ├── AdminDashboard.tsx      # Admin analytics
    │   │   ├── AdminAttendance.tsx     # Attendance management
    │   │   └── AdminSettings.tsx       # Time configuration
    │   ├── App.tsx             # Main app with routing
    │   └── api.ts              # API client
    └── package.json
```

## 🔧 Technology Stack

**Backend:**
- FastAPI - Modern Python web framework
- SQLAlchemy - ORM for database
- SQLite - Database (easy setup, no server needed)
- DeepFace - Face recognition library
- TensorFlow - ML backend for face recognition

**Frontend:**
- React - UI library
- TypeScript - Type safety
- React Router - Navigation
- Axios - HTTP client
- Vite - Build tool

## 📚 API Endpoints

### Student Endpoints
- `POST /students/` - Register new student
- `GET /students` - Get all students
- `POST /attendance/mark` - Mark attendance via face recognition
- `GET /attendance` - Get attendance records

### Admin Endpoints
- `POST /admin/register` - Register admin user
- `POST /admin/login` - Admin authentication
- `GET /admin/stats` - Get attendance statistics
- `GET /admin/attendance` - Get detailed attendance records
- `PUT /admin/attendance/{id}` - Update attendance record
- `GET /admin/settings` - Get attendance settings
- `PUT /admin/settings` - Update attendance settings
- `DELETE /students/{id}` - Delete student

## 📊 Admin Features Details

See [ADMIN_FEATURES.md](ADMIN_FEATURES.md) for complete admin panel documentation.

## 🔒 Security

- Admin passwords are hashed using SHA-256
- Protected routes require authentication
- Face recognition confidence tracking
- Prevent duplicate attendance for same day

## 🐛 Troubleshooting

**Camera not working:**
- Allow camera permissions in your browser
- Check if another application is using the camera

**Face not recognized:**
- Ensure good lighting
- Face the camera directly
- Make sure you're registered in the system

**Backend errors:**
- Check if all dependencies are installed
- Ensure database is initialized (`python init_admin.py`)
- Check backend console for error messages

## 📝 Notes

- Database file: `smart_attendance.db` (SQLite)
- Student images stored in: `backend/dataset/`
- Admin session stored in browser localStorage
- Attendance marked only once per day per student

## 🎯 Future Enhancements

- Export attendance reports (CSV/PDF)
- Email notifications
- Multi-week analytics charts
- Bulk attendance operations
- Student portal for viewing own attendance
- Mobile app support
