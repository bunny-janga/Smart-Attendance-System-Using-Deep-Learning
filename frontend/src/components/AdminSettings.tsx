import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Save, ArrowLeft, Plus, Trash2, Pencil, Check, X, Clock, AlertCircle } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────
interface GlobalSettings {
    id: string;
    attendance_start_time: string;
    late_threshold_minutes: number;
}

interface Period {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    late_threshold_minutes: number;
    is_active: number;
}

type PeriodForm = Omit<Period, 'id'>;

const emptyForm = (): PeriodForm => ({
    name: '',
    start_time: '09:00',
    end_time: '10:00',
    late_threshold_minutes: 10,
    is_active: 1,
});

// Time math helper
const addMinutes = (hhmm: string, mins: number): string => {
    const [h, m] = hhmm.split(':').map(Number);
    const total = h * 60 + m + mins;
    const hh = Math.floor(total / 60) % 24;
    const mm = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

// ── Component ──────────────────────────────────────────────
const AdminSettings = () => {
    const navigate   = useNavigate();
    const [settings, setSettings]   = useState<GlobalSettings | null>(null);
    const [periods,  setPeriods]    = useState<Period[]>([]);
    const [globalMsg, setGlobalMsg] = useState<{ type: 'success'|'error'; text: string } | null>(null);

    // "Add" panel state
    const [showAdd, setShowAdd]     = useState(false);
    const [addForm, setAddForm]     = useState<PeriodForm>(emptyForm());
    const [addErr,  setAddErr]      = useState('');
    const [addSave, setAddSave]     = useState(false);

    // "Edit" state — keyed by period id
    const [editId,   setEditId]     = useState<string | null>(null);
    const [editForm, setEditForm]   = useState<PeriodForm>(emptyForm());
    const [editErr,  setEditErr]    = useState('');
    const [editSave, setEditSave]   = useState(false);

    // Delete
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const toast = (type: 'success'|'error', text: string) => {
        setGlobalMsg({ type, text });
        setTimeout(() => setGlobalMsg(null), 3200);
    };

    useEffect(() => {
        if (!localStorage.getItem('admin')) { navigate('/admin/login'); return; }
        fetchAll();
    }, []);

    const fetchAll = async () => {
        const [sRes, pRes] = await Promise.all([
            api.get('/admin/settings').catch(() => null),
            api.get('/admin/periods').catch(() => null),
        ]);
        if (sRes) setSettings(sRes.data);
        if (pRes) setPeriods(pRes.data);
    };

    // ── Global settings save ──
    const saveGlobal = async () => {
        if (!settings) return;
        try {
            await api.put('/admin/settings', {
                attendance_start_time:  settings.attendance_start_time,
                late_threshold_minutes: settings.late_threshold_minutes,
            });
            toast('success', 'Global default saved!');
        } catch { toast('error', 'Failed to save global settings.'); }
    };

    // ── Add period ──
    const submitAdd = async () => {
        setAddErr('');
        if (!addForm.name.trim())          { setAddErr('Period name is required.'); return; }
        if (addForm.start_time >= addForm.end_time) { setAddErr('End time must be after start time.'); return; }
        setAddSave(true);
        try {
            await api.post('/admin/periods', addForm);
            toast('success', `"${addForm.name}" added!`);
            setShowAdd(false);
            setAddForm(emptyForm());
            fetchAll();
        } catch (e: any) {
            setAddErr(e?.response?.data?.detail || 'Failed to add period.');
        } finally { setAddSave(false); }
    };

    // ── Edit period ──
    const openEdit = (p: Period) => {
        setEditId(p.id);
        setEditErr('');
        setEditForm({ name: p.name, start_time: p.start_time, end_time: p.end_time, late_threshold_minutes: p.late_threshold_minutes, is_active: p.is_active });
    };

    const submitEdit = async () => {
        if (!editId) return;
        setEditErr('');
        if (!editForm.name.trim())                  { setEditErr('Period name is required.'); return; }
        if (editForm.start_time >= editForm.end_time) { setEditErr('End time must be after start time.'); return; }
        setEditSave(true);
        try {
            await api.put(`/admin/periods/${editId}`, editForm);
            toast('success', `"${editForm.name}" updated!`);
            setEditId(null);
            fetchAll();
        } catch (e: any) {
            setEditErr(e?.response?.data?.detail || 'Failed to update period.');
        } finally { setEditSave(false); }
    };

    // ── Toggle active ──
    const toggleActive = async (p: Period) => {
        try {
            await api.put(`/admin/periods/${p.id}`, { is_active: p.is_active === 1 ? 0 : 1 });
            fetchAll();
        } catch { toast('error', 'Failed to toggle period.'); }
    };

    // ── Delete period ──
    const deletePeriod = async (id: string) => {
        setDeletingId(id);
        try {
            await api.delete(`/admin/periods/${id}`);
            toast('success', 'Period deleted.');
            fetchAll();
        } catch { toast('error', 'Failed to delete period.'); }
        finally { setDeletingId(null); }
    };

    if (!settings) return (
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Loading settings…</div>
        </div>
    );

    return (
        <div className="container" style={{ maxWidth: 860 }}>
            {/* Toast */}
            {globalMsg && (
                <div style={{
                    position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
                    background: globalMsg.type === 'success' ? 'rgba(34,197,94,0.95)' : 'rgba(239,68,68,0.95)',
                    color: 'white', padding: '0.9rem 1.5rem', borderRadius: '0.75rem',
                    fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                    {globalMsg.text}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => navigate('/admin/dashboard')} className="btn btn-secondary">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 style={{ margin: 0 }}>Attendance Settings</h2>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Configure global defaults and multiple attendance periods
                    </p>
                </div>
            </div>

            {/* ── Global Default ─────────────────────────────── */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '0.5rem', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={18} color="#6366f1" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700 }}>Global Default</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Fallback when no period matches</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    <div className="input-group" style={{ margin: 0 }}>
                        <label>Default Start Time</label>
                        <input type="time" value={settings.attendance_start_time}
                            onChange={e => setSettings({ ...settings, attendance_start_time: e.target.value })} />
                        <small style={{ color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block', fontSize: '0.78rem' }}>
                            Used when no period covers the check-in time
                        </small>
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                        <label>Late Threshold (Minutes)</label>
                        <input type="number" value={settings.late_threshold_minutes} min={0} max={120}
                            onChange={e => setSettings({ ...settings, late_threshold_minutes: parseInt(e.target.value) || 0 })} />
                        <small style={{ color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block', fontSize: '0.78rem' }}>
                            Late after {addMinutes(settings.attendance_start_time, settings.late_threshold_minutes)}
                        </small>
                    </div>
                </div>

                <button onClick={saveGlobal} className="btn" style={{ gap: '0.5rem' }}>
                    <Save size={16} /> Save Default
                </button>
            </div>

            {/* ── Attendance Periods ──────────────────────────── */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '0.5rem', background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Clock size={18} color="#a855f7" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700 }}>Attendance Periods</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{periods.length} period{periods.length !== 1 ? 's' : ''} configured</div>
                        </div>
                    </div>
                    <button onClick={() => { setShowAdd(true); setAddForm(emptyForm()); setAddErr(''); }}
                        className="btn" style={{ background: 'linear-gradient(135deg,#a855f7,#6366f1)', gap: '0.4rem', padding: '0.55rem 1.1rem', fontSize: '0.88rem' }}>
                        <Plus size={16} /> Add Period
                    </button>
                </div>

                {/* Add Period Form */}
                {showAdd && (
                    <div style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '0.85rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
                        <div style={{ fontWeight: 600, marginBottom: '1rem', color: '#d8b4fe', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Plus size={15} /> New Period
                        </div>
                        <PeriodFormFields form={addForm} onChange={setAddForm} />
                        {addErr && <ErrorBar text={addErr} />}
                        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
                            <button onClick={submitAdd} disabled={addSave} className="btn"
                                style={{ background: 'linear-gradient(135deg,#a855f7,#6366f1)', gap: '0.4rem', padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}>
                                <Check size={15} /> {addSave ? 'Saving…' : 'Save Period'}
                            </button>
                            <button onClick={() => setShowAdd(false)} disabled={addSave} className="btn btn-secondary"
                                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', gap: '0.4rem' }}>
                                <X size={15} /> Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Period List */}
                {periods.length === 0 && !showAdd ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                        <Clock size={36} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
                        <div style={{ fontWeight: 500 }}>No periods configured yet</div>
                        <div style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>Click "Add Period" to create your first attendance slot</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {periods.map(p => (
                            <div key={p.id}>
                                {editId === p.id ? (
                                    /* ── Inline Edit ── */
                                    <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '0.85rem', padding: '1.25rem' }}>
                                        <div style={{ fontWeight: 600, marginBottom: '1rem', color: '#a5b4fc', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Pencil size={14} /> Editing — {p.name}
                                        </div>
                                        <PeriodFormFields form={editForm} onChange={setEditForm} />
                                        {editErr && <ErrorBar text={editErr} />}
                                        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
                                            <button onClick={submitEdit} disabled={editSave} className="btn"
                                                style={{ gap: '0.4rem', padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}>
                                                <Check size={15} /> {editSave ? 'Saving…' : 'Update'}
                                            </button>
                                            <button onClick={() => setEditId(null)} disabled={editSave} className="btn btn-secondary"
                                                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', gap: '0.4rem' }}>
                                                <X size={15} /> Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* ── Period Card ── */
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        padding: '1rem 1.25rem', borderRadius: '0.85rem',
                                        background: p.is_active ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)',
                                        border: p.is_active ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(255,255,255,0.05)',
                                        opacity: p.is_active ? 1 : 0.55,
                                        transition: 'all 0.2s',
                                    }}>
                                        {/* Color dot */}
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.is_active ? '#6366f1' : '#475569', flexShrink: 0 }} />

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{p.name}</div>
                                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                <TimeChip label="Start" value={p.start_time} />
                                                <TimeChip label="End"   value={p.end_time} />
                                                <TimeChip label="Late after" value={addMinutes(p.start_time, p.late_threshold_minutes)} />
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    Grace: {p.late_threshold_minutes} min
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                            {/* Active toggle */}
                                            <button onClick={() => toggleActive(p)} title={p.is_active ? 'Disable' : 'Enable'}
                                                style={{ background: p.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)', border: `1px solid ${p.is_active ? 'rgba(34,197,94,0.35)' : 'rgba(100,116,139,0.3)'}`, color: p.is_active ? '#22c55e' : '#64748b', cursor: 'pointer', borderRadius: '0.5rem', padding: '0.38rem 0.75rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                                {p.is_active ? '● Active' : '○ Inactive'}
                                            </button>
                                            {/* Edit */}
                                            <button onClick={() => openEdit(p)} title="Edit"
                                                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', cursor: 'pointer', borderRadius: '0.5rem', padding: '0.38rem 0.65rem', display: 'flex', alignItems: 'center' }}>
                                                <Pencil size={14} />
                                            </button>
                                            {/* Delete */}
                                            <button onClick={() => deletePeriod(p.id)} disabled={deletingId === p.id} title="Delete"
                                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer', borderRadius: '0.5rem', padding: '0.38rem 0.65rem', display: 'flex', alignItems: 'center' }}>
                                                {deletingId === p.id ? '…' : <Trash2 size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Timeline preview */}
                {periods.filter(p => p.is_active).length > 0 && (
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                            Daily Timeline (Active Periods)
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {periods.filter(p => p.is_active).map(p => (
                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-muted)', width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.start_time}</span>
                                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(99,102,241,0.25)', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(p.late_threshold_minutes / 60) * 100}%`, background: 'rgba(234,179,8,0.5)', borderRadius: 3 }} />
                                        <div style={{ position: 'absolute', left: `${(p.late_threshold_minutes / 60) * 100}%`, top: 0, bottom: 0, right: 0, background: 'rgba(99,102,241,0.4)', borderRadius: 3 }} />
                                    </div>
                                    <span style={{ color: 'var(--text-muted)', width: 40, fontVariantNumeric: 'tabular-nums' }}>{p.end_time}</span>
                                    <span style={{ fontWeight: 600, color: '#a5b4fc', minWidth: 90 }}>{p.name}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <span>🟡 Grace / on-time window</span>
                            <span>🟣 Period in progress</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Sub-components ─────────────────────────────────────────
const PeriodFormFields = ({ form, onChange }: { form: PeriodForm; onChange: (f: PeriodForm) => void }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
        <div style={{ gridColumn: '1/-1' }}>
            <FieldLabel>Period Name</FieldLabel>
            <input value={form.name} placeholder="e.g. Morning Class, Period 1"
                onChange={e => onChange({ ...form, name: e.target.value })} style={fi} />
        </div>
        <div>
            <FieldLabel>Start Time</FieldLabel>
            <input type="time" value={form.start_time}
                onChange={e => onChange({ ...form, start_time: e.target.value })} style={fi} />
        </div>
        <div>
            <FieldLabel>End Time</FieldLabel>
            <input type="time" value={form.end_time}
                onChange={e => onChange({ ...form, end_time: e.target.value })} style={fi} />
        </div>
        <div>
            <FieldLabel>Late Threshold (Minutes)</FieldLabel>
            <input type="number" value={form.late_threshold_minutes} min={0} max={60}
                onChange={e => onChange({ ...form, late_threshold_minutes: parseInt(e.target.value) || 0 })} style={fi} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            {form.start_time && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingBottom: '0.75rem' }}>
                    <span style={{ color: '#eab308' }}>On-time</span> until{' '}
                    <span style={{ color: '#a5b4fc', fontWeight: 600 }}>
                        {addMinutes(form.start_time, form.late_threshold_minutes)}
                    </span>
                </div>
            )}
        </div>
    </div>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 500 }}>
        {children}
    </label>
);

const ErrorBar = ({ text }: { text: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.6rem 0.9rem', borderRadius: '0.5rem', fontSize: '0.85rem', marginTop: '0.75rem' }}>
        <AlertCircle size={14} /> {text}
    </div>
);

const TimeChip = ({ label, value }: { label: string; value: string }) => (
    <span style={{ fontSize: '0.78rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{value}</span>
    </span>
);

// shared input style
const fi: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.85rem', borderRadius: '0.5rem',
    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'white', fontSize: '0.9rem', boxSizing: 'border-box',
};

export default AdminSettings;
