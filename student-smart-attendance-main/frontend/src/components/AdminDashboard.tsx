import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Users, CheckCircle, Clock, XCircle, TrendingUp, Calendar } from 'lucide-react';

interface Stats {
    total_students: number;
    present_today: number;
    late_today: number;
    absent_today: number;
    attendance_rate: number;
}

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<Stats | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const admin = localStorage.getItem('admin');
        if (!admin) {
            navigate('/admin/login');
            return;
        }
        fetchStats();
    }, [selectedDate]);

    const fetchStats = async () => {
        try {
            const response = await api.get(`/admin/stats?date=${selectedDate}`);
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin');
        navigate('/admin/login');
    };

    if (!stats) return <div className="container">Loading...</div>;

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Admin Dashboard</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{ width: 'auto' }}
                        />
                    </div>
                    <button onClick={handleLogout} className="btn btn-secondary">
                        Logout
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div 
                    className="card" 
                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', cursor: 'pointer' }}
                    onClick={() => navigate('/')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Users size={40} />
                        <div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.total_students}</div>
                            <div style={{ opacity: 0.9 }}>Total Students</div>
                        </div>
                    </div>
                </div>

                <div 
                    className="card" 
                    style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', cursor: 'pointer' }}
                    onClick={() => navigate('/admin/attendance')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <CheckCircle size={40} />
                        <div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.present_today}</div>
                            <div style={{ opacity: 0.9 }}>Present Today</div>
                        </div>
                    </div>
                </div>

                <div 
                    className="card" 
                    style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', cursor: 'pointer' }}
                    onClick={() => navigate('/admin/attendance')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Clock size={40} />
                        <div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.late_today}</div>
                            <div style={{ opacity: 0.9 }}>Late Today</div>
                        </div>
                    </div>
                </div>

                <div 
                    className="card" 
                    style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', cursor: 'pointer' }}
                    onClick={() => navigate('/admin/attendance')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <XCircle size={40} />
                        <div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.absent_today}</div>
                            <div style={{ opacity: 0.9 }}>Absent Today</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid">
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Attendance Rate</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <TrendingUp size={48} style={{ color: stats.attendance_rate >= 75 ? '#22c55e' : '#ef4444' }} />
                        <div>
                            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: stats.attendance_rate >= 75 ? '#22c55e' : '#ef4444' }}>
                                {stats.attendance_rate}%
                            </div>
                            <div style={{ color: 'var(--text-muted)' }}>Overall Attendance</div>
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ 
                            height: '100%', 
                            width: `${stats.attendance_rate}%`, 
                            background: stats.attendance_rate >= 75 ? '#22c55e' : '#ef4444',
                            transition: 'width 0.3s'
                        }} />
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Quick Actions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button 
                            onClick={() => navigate('/admin/attendance')}
                            className="btn"
                            style={{ width: '100%' }}
                        >
                            <Calendar size={20} /> Manage Attendance
                        </button>
                        <button 
                            onClick={() => navigate('/admin/settings')}
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                        >
                            Settings
                        </button>
                        <button 
                            onClick={() => navigate('/')}
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                        >
                            View Students
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
