import { useEffect, useState } from 'react';
import api from '../api';

// ── Types ──────────────────────────────────────────────────
interface Student {
    id: string;
    name: string;
    student_id: string;
    email: string;
    course: string;
    enrollment_date: string;
    avatar_url: string | null;
    created_at: string;
}

interface AttendanceRecord {
    id: string;
    date: string;
    check_in_time: string | null;
    status: string;
    is_late: number;
    confidence: number | null;
    notes: string | null;
}

interface StudentDetail extends Student {
    stats: {
        total_records: number;
        present: number;
        late: number;
        absent: number;
        attendance_rate: number;
    };
    attendance_records: AttendanceRecord[];
}

interface EditForm {
    name: string;
    student_id: string;
    email: string;
    course: string;
    enrollment_date: string;
}

// ── Helpers ────────────────────────────────────────────────
const statusColor: Record<string, { bg: string; color: string }> = {
    Present: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    Late:    { bg: 'rgba(234,179,8,0.15)',  color: '#eab308' },
    Absent:  { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
};

const getAvatarSrc = (s: { student_id: string; avatar_url: string | null }) =>
    `http://localhost:8000/dataset/${s.student_id}.jpg`;

const tagStyle = (color: string): React.CSSProperties => ({
    background: `${color}22`, color,
    padding: '0.15rem 0.6rem', borderRadius: '0.4rem',
    fontSize: '0.78rem', fontWeight: 600, border: `1px solid ${color}44`,
});

// ── Shared modal overlay / container ───────────────────────
const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, backdropFilter: 'blur(4px)', padding: '1rem',
};

const modalStyle: React.CSSProperties = {
    background: 'var(--surface)', borderRadius: '1.25rem',
    padding: '2rem', width: '100%', maxWidth: 720,
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
    maxHeight: '90vh', overflowY: 'auto',
};

const closeBtnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '50%',
    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1rem', flexShrink: 0,
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.9rem', borderRadius: '0.5rem',
    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'white', fontSize: '0.95rem', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
};

// ── Component ──────────────────────────────────────────────
const Dashboard = () => {
    const [students, setStudents]             = useState<Student[]>([]);
    const [stats, setStats]                   = useState({ totalStudents: 0, totalAttendance: 0 });
    const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
    const [loadingDetail, setLoadingDetail]   = useState(false);
    const [deleteTarget, setDeleteTarget]     = useState<Student | null>(null);
    const [deleting, setDeleting]             = useState(false);
    const [editTarget, setEditTarget]         = useState<Student | null>(null);
    const [editForm, setEditForm]             = useState<EditForm | null>(null);
    const [editSaving, setEditSaving]         = useState(false);
    const [editError, setEditError]           = useState('');
    const [notification, setNotification]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const toast = (msg: string, type: 'success' | 'error') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3500);
    };

    const fetchData = async () => {
        try {
            const [sRes, aRes] = await Promise.all([api.get('/students'), api.get('/attendance')]);
            setStudents(sRes.data);
            setStats({ totalStudents: sRes.data.length, totalAttendance: aRes.data.length });
        } catch { console.error('Failed to fetch data'); }
    };

    useEffect(() => { fetchData(); }, []);

    // ── Open detail modal ──
    const openDetail = async (student: Student) => {
        setLoadingDetail(true);
        setSelectedStudent(null);
        try {
            const res = await api.get(`/students/${student.id}`);
            setSelectedStudent(res.data);
        } catch { toast('Failed to load student details.', 'error'); }
        finally { setLoadingDetail(false); }
    };

    // ── Open edit modal ──
    const openEdit = (student: Student) => {
        setEditTarget(student);
        setEditError('');
        setEditForm({
            name:            student.name,
            student_id:      student.student_id,
            email:           student.email,
            course:          student.course,
            enrollment_date: student.enrollment_date,
        });
        setSelectedStudent(null); // close detail if open
    };

    const saveEdit = async () => {
        if (!editTarget || !editForm) return;
        setEditSaving(true);
        setEditError('');
        try {
            await api.put(`/students/${editTarget.id}`, editForm);
            toast(`${editForm.name} updated successfully.`, 'success');
            setEditTarget(null);
            setEditForm(null);
            fetchData();
        } catch (err: any) {
            const detail = err?.response?.data?.detail || 'Failed to save changes.';
            setEditError(detail);
        } finally { setEditSaving(false); }
    };

    // ── Delete ──
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/students/${deleteTarget.id}`);
            toast(`${deleteTarget.name} has been removed.`, 'success');
            setDeleteTarget(null);
            if (selectedStudent?.id === deleteTarget.id) setSelectedStudent(null);
            fetchData();
        } catch { toast('Failed to delete student.', 'error'); }
        finally { setDeleting(false); }
    };

    // ── Render ─────────────────────────────────────────────
    return (
        <div className="container">

            {/* Toast */}
            {notification && (
                <div style={{
                    position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
                    background: notification.type === 'success' ? 'rgba(34,197,94,0.95)' : 'rgba(239,68,68,0.95)',
                    color: 'white', padding: '0.9rem 1.5rem', borderRadius: '0.75rem',
                    fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                    {notification.msg}
                </div>
            )}

            <h2>Dashboard</h2>

            {/* Stats */}
            <div className="grid" style={{ marginBottom: '2rem' }}>
                {[
                    { val: stats.totalStudents,  label: 'Total Students',     sub: 'Registered',    color: '#6366f1', bg: 'rgba(99,102,241,0.2)' },
                    { val: stats.totalAttendance, label: 'Total Attendance',   sub: 'Records Logged', color: '#22c55e', bg: 'rgba(34,197,94,0.2)' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: s.bg, borderRadius: '1rem' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: s.color }}>{s.val}</span>
                        </div>
                        <div>
                            <div style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                            <div style={{ fontWeight: 500 }}>{s.sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Students Table */}
            <div className="card">
                <h3 style={{ marginBottom: '1.5rem' }}>Registered Students</h3>
                {students.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No students registered.</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Photo</th>
                                <th>Name</th>
                                <th>Roll No</th>
                                <th>Course</th>
                                <th>Email</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(student => (
                                <tr key={student.id}
                                    onClick={() => openDetail(student)}
                                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <td>
                                        <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: '#1e293b', border: '2px solid rgba(99,102,241,0.3)' }}>
                                            {student.avatar_url && (
                                                <img src={getAvatarSrc(student)}
                                                    onError={e => { (e.target as HTMLImageElement).src = `http://localhost:8000/${student.avatar_url}`; }}
                                                    alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{student.name}</td>
                                    <td><span style={tagStyle('#6366f1')}>{student.student_id}</span></td>
                                    <td style={{ color: 'var(--text-muted)' }}>{student.course}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{student.email}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.45rem', justifyContent: 'center' }}
                                             onClick={e => e.stopPropagation()}>
                                            {/* View */}
                                            <ActionBtn color="#6366f1" onClick={() => openDetail(student)} title="View Details">
                                                <EyeIcon /> View
                                            </ActionBtn>
                                            {/* Edit */}
                                            <ActionBtn color="#a855f7" onClick={() => openEdit(student)} title="Edit Student">
                                                <EditIcon /> Edit
                                            </ActionBtn>
                                            {/* Delete */}
                                            <ActionBtn color="#ef4444" onClick={() => setDeleteTarget(student)} title="Delete Student">
                                                <TrashIcon /> Delete
                                            </ActionBtn>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ══ DETAIL MODAL ══════════════════════════════════ */}
            {(loadingDetail || selectedStudent) && (
                <div style={overlayStyle} onClick={() => { if (!loadingDetail) setSelectedStudent(null); }}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        {loadingDetail ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
                                Loading student details…
                            </div>
                        ) : selectedStudent && (
                            <>
                                {/* Header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.75rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: '#0f172a', border: '3px solid #6366f1', flexShrink: 0 }}>
                                        {selectedStudent.avatar_url && (
                                            <img src={getAvatarSrc(selectedStudent)}
                                                onError={e => { (e.target as HTMLImageElement).src = `http://localhost:8000/${selectedStudent.avatar_url}`; }}
                                                alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>{selectedStudent.name}</h2>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{selectedStudent.email}</div>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                            <span style={tagStyle('#6366f1')}>{selectedStudent.student_id}</span>
                                            <span style={tagStyle('#a855f7')}>{selectedStudent.course}</span>
                                            <span style={tagStyle('#0ea5e9')}>Enrolled: {selectedStudent.enrollment_date}</span>
                                        </div>
                                    </div>
                                    <button style={closeBtnStyle} onClick={() => setSelectedStudent(null)}>✕</button>
                                </div>

                                {/* Stat Cards */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
                                    {[
                                        { label: 'Attendance Rate', value: `${selectedStudent.stats.attendance_rate}%`, color: '#6366f1' },
                                        { label: 'Present',          value: selectedStudent.stats.present,               color: '#22c55e' },
                                        { label: 'Late',             value: selectedStudent.stats.late,                  color: '#eab308' },
                                        { label: 'Absent',           value: selectedStudent.stats.absent,                color: '#ef4444' },
                                    ].map(s => (
                                        <div key={s.label} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center', border: `1px solid ${s.color}22` }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Attendance Table */}
                                <h4 style={{ margin: '0 0 0.75rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                                    Attendance History ({selectedStudent.stats.total_records} records)
                                </h4>
                                <div style={{ maxHeight: '260px', overflowY: 'auto', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    {selectedStudent.attendance_records.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No attendance records found.</div>
                                    ) : (
                                        <table style={{ margin: 0 }}>
                                            <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
                                                <tr><th>Date</th><th>Check-In Time</th><th>Status</th><th>Confidence</th></tr>
                                            </thead>
                                            <tbody>
                                                {selectedStudent.attendance_records.map(rec => {
                                                    const sc = statusColor[rec.status] || { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' };
                                                    return (
                                                        <tr key={rec.id}>
                                                            <td style={{ fontWeight: 500 }}>{rec.date}</td>
                                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                                {rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString() : '—'}
                                                            </td>
                                                            <td>
                                                                <span style={{ background: sc.bg, color: sc.color, padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 600 }}>
                                                                    {rec.status}
                                                                </span>
                                                            </td>
                                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                                {rec.confidence != null ? `${rec.confidence}%` : '—'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* Footer */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                    <button onClick={() => openEdit(selectedStudent)} style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)', color: '#d8b4fe', cursor: 'pointer', borderRadius: '0.5rem', padding: '0.6rem 1.2rem', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <EditIcon /> Edit Student
                                    </button>
                                    <button onClick={() => { setDeleteTarget(students.find(s => s.id === selectedStudent.id) || null); setSelectedStudent(null); }} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', cursor: 'pointer', borderRadius: '0.5rem', padding: '0.6rem 1.2rem', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <TrashIcon /> Delete
                                    </button>
                                    <button onClick={() => setSelectedStudent(null)} className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem' }}>Close</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ══ EDIT MODAL ════════════════════════════════════ */}
            {editTarget && editForm && (
                <div style={overlayStyle} onClick={() => { if (!editSaving) { setEditTarget(null); setEditForm(null); } }}>
                    <div style={{ ...modalStyle, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(168,85,247,0.15)', border: '2px solid rgba(168,85,247,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <EditIcon color="#d8b4fe" size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Edit Student</h3>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>Update details for {editTarget.name}</div>
                            </div>
                            <button style={closeBtnStyle} onClick={() => { setEditTarget(null); setEditForm(null); }}>✕</button>
                        </div>

                        {/* Form */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <FormField label="Full Name" value={editForm.name}
                                onChange={v => setEditForm(f => f ? { ...f, name: v } : f)} />
                            <FormField label="Roll Number / Student ID" value={editForm.student_id}
                                onChange={v => setEditForm(f => f ? { ...f, student_id: v } : f)} />
                            <FormField label="Email Address" value={editForm.email} type="email"
                                onChange={v => setEditForm(f => f ? { ...f, email: v } : f)} />
                            <FormField label="Course" value={editForm.course}
                                onChange={v => setEditForm(f => f ? { ...f, course: v } : f)} />
                            <div style={{ gridColumn: '1 / -1' }}>
                                <FormField label="Enrollment Date" value={editForm.enrollment_date} type="date"
                                    onChange={v => setEditForm(f => f ? { ...f, enrollment_date: v } : f)} />
                            </div>
                        </div>

                        {/* Error */}
                        {editError && (
                            <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
                                ⚠️ {editError}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <button onClick={() => { setEditTarget(null); setEditForm(null); }} disabled={editSaving}
                                className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem' }}>
                                Cancel
                            </button>
                            <button onClick={saveEdit} disabled={editSaving} className="btn"
                                style={{ padding: '0.6rem 1.75rem', background: 'linear-gradient(135deg,#a855f7,#6366f1)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {editSaving ? <>⏳ Saving…</> : <><SaveIcon /> Save Changes</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ DELETE CONFIRM ════════════════════════════════ */}
            {deleteTarget && (
                <div style={overlayStyle} onClick={() => { if (!deleting) setDeleteTarget(null); }}>
                    <div style={{ ...modalStyle, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ width: 60, height: 60, background: 'rgba(239,68,68,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                <TrashIcon size={26} color="#ef4444" />
                            </div>
                            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>Delete Student?</h3>
                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                                You are about to permanently delete{' '}
                                <strong style={{ color: 'var(--text)' }}>{deleteTarget.name}</strong>{' '}
                                ({deleteTarget.student_id}). This will remove their profile image and all attendance data.{' '}
                                <strong style={{ color: '#ef4444' }}>This cannot be undone.</strong>
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                                className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            <button onClick={confirmDelete} disabled={deleting}
                                className="btn" style={{ flex: 1, background: '#ef4444' }}>
                                {deleting ? 'Deleting…' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Sub-components ─────────────────────────────────────────
const FormField = ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
    <div>
        <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, letterSpacing: '0.03em' }}>
            {label}
        </label>
        <input
            type={type} value={value}
            onChange={e => onChange(e.target.value)}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#a855f7')}
            onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
        />
    </div>
);

const ActionBtn = ({ children, color, onClick, title }: { children: React.ReactNode; color: string; onClick: () => void; title?: string }) => (
    <button title={title} onClick={onClick} style={{
        background: `${color}1a`, border: `1px solid ${color}44`,
        color: color === '#ef4444' ? '#f87171' : color === '#a855f7' ? '#d8b4fe' : '#a5b4fc',
        cursor: 'pointer', borderRadius: '0.5rem', padding: '0.38rem 0.8rem',
        fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', gap: '0.3rem',
    }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color}33`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color}1a`; }}>
        {children}
    </button>
);

// ── Inline SVG Icons ───────────────────────────────────────
const EyeIcon = () => (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
);

const EditIcon = ({ color = 'currentColor', size = 13 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
);

const TrashIcon = ({ color = 'currentColor', size = 13 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
);

const SaveIcon = () => (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
    </svg>
);

export default Dashboard;
