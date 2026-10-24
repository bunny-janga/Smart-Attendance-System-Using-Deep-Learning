import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, UserPlus, Camera, Shield, Users } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Registration from './components/Registration';
import Attendance from './components/Attendance';
import MultiFaceAttendance from './components/MultiFaceAttendance';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import AdminAttendance from './components/AdminAttendance';
import AdminSettings from './components/AdminSettings';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Admin routes without sidebar */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/attendance" element={<AdminAttendance />} />
        <Route path="/admin/settings" element={<AdminSettings />} />

        {/* Student routes with sidebar */}
        <Route path="/*" element={<MainLayout />} />
      </Routes>
    </Router>
  );
}

function MainLayout() {
  return (
    <div className="app">
      <nav>
        <h1>Smart Attendance System</h1>
        <div className="nav-links">
          <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LayoutDashboard size={18} /> Dashboard
            </div>
          </NavLink>
          <NavLink to="/attendance" className={({ isActive }) => isActive ? 'active' : ''}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Camera size={18} /> Attendance
            </div>
          </NavLink>
          <NavLink to="/multi-attendance" className={({ isActive }) => isActive ? 'active' : ''}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} /> Multi-Face
            </div>
          </NavLink>
          <NavLink to="/register" className={({ isActive }) => isActive ? 'active' : ''}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={18} /> Register
            </div>
          </NavLink>
          <NavLink to="/admin/login" className={({ isActive }) => isActive ? 'active' : ''}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} /> Admin
            </div>
          </NavLink>
        </div>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/multi-attendance" element={<MultiFaceAttendance />} />
          <Route path="/register" element={<Registration />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
