import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Edit, Save, X } from 'lucide-react';

interface AttendanceRecord {
    id: string;
    date: string;
    check_in_time: string;
    status: string;
    is_late: number;
    confidence: number;
    notes: string;
    student: {
        id: string;
        name: string;
        student_id: string;
        email: string;
        course: string;
    };
}

const AdminAttendance = () => {
    const navigate = useNavigate();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});

    useEffect(() => {
        const admin = localStorage.getItem('admin');
        if (!admin) {
            navigate('/admin/login');
            return;
        }
        fetchRecords();
    }, [selectedDate]);

    const fetchRecords = async () => {
        try {
            const response = await api.get(`/admin/attendance?date=${selectedDate}`);
            setRecords(response.data);
        } catch (error) {
            console.error('Failed to fetch records', error);
        }
    };

    const startEdit = (record: AttendanceRecord) => {
        setEditingId(record.id);
        setEditData({
            status: record.status,
            is_late: record.is_late,
            notes: record.notes || ''
        });
    };

    const saveEdit = async (id: string) => {
        try {
            await api.put(`/admin/attendance/${id}`, editData);
            setEditingId(null);
            fetchRecords();
        } catch (error) {
            console.error('Failed to update record', error);
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    return (
        <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => navigate('/admin/dashboard')} className="btn btn-secondary">
                    <ArrowLeft size={20} />
                </button>
                <h2>Manage Attendance</h2>
                <div style={{ marginLeft: 'auto' }}>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '1.5rem' }}>
                    Attendance Records - {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>

                {records.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                        No attendance records for this date
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Student ID</th>
                                    <th>Name</th>
                                    <th>Course</th>
                                    <th>Check-in Time</th>
                                    <th>Status</th>
                                    <th>Late</th>
                                    <th>Confidence</th>
                                    <th>Notes</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => (
                                    <tr key={record.id}>
                                        <td>{record.student.student_id}</td>
                                        <td>{record.student.name}</td>
                                        <td>{record.student.course}</td>
                                        <td>{new Date(record.check_in_time).toLocaleTimeString()}</td>
                                        <td>
                                            {editingId === record.id ? (
                                                <select
                                                    value={editData.status}
                                                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem' }}
                                                >
                                                    <option value="Present">Present</option>
                                                    <option value="Late">Late</option>
                                                    <option value="Absent">Absent</option>
                                                </select>
                                            ) : (
                                                <span className="status-badge" style={{ 
                                                    background: record.status === 'Late' ? 'rgba(245, 158, 11, 0.2)' : 
                                                               record.status === 'Absent' ? 'rgba(239, 68, 68, 0.2)' : 
                                                               'rgba(34, 197, 94, 0.2)',
                                                    color: record.status === 'Late' ? '#f59e0b' : 
                                                          record.status === 'Absent' ? '#ef4444' : '#22c55e'
                                                }}>
                                                    {record.status}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {editingId === record.id ? (
                                                <select
                                                    value={editData.is_late}
                                                    onChange={(e) => setEditData({ ...editData, is_late: parseInt(e.target.value) })}
                                                    style={{ width: '100%', padding: '0.5rem' }}
                                                >
                                                    <option value="0">No</option>
                                                    <option value="1">Yes</option>
                                                </select>
                                            ) : (
                                                record.is_late ? 'Yes' : 'No'
                                            )}
                                        </td>
                                        <td>{record.confidence ? `${(record.confidence * 100).toFixed(1)}%` : 'N/A'}</td>
                                        <td>
                                            {editingId === record.id ? (
                                                <input
                                                    value={editData.notes}
                                                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                                    placeholder="Add notes..."
                                                    style={{ width: '100%', padding: '0.5rem' }}
                                                />
                                            ) : (
                                                record.notes || '-'
                                            )}
                                        </td>
                                        <td>
                                            {editingId === record.id ? (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button 
                                                        onClick={() => saveEdit(record.id)}
                                                        className="btn"
                                                        style={{ padding: '0.5rem' }}
                                                    >
                                                        <Save size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={cancelEdit}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.5rem' }}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => startEdit(record)}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.5rem' }}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminAttendance;
