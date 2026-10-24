import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import api from '../api';
import { CheckCircle, XCircle, Play, Square, Loader2, Camera } from 'lucide-react';

interface AttendanceResult {
    message: string;
    student?: string;
    student_id?: string;
    status?: string;
    period?: string | null;
    time?: string;
    confidence?: number;
    already_marked?: boolean;
}

const Attendance = () => {
    const webcamRef = useRef<Webcam>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [lastResult, setLastResult] = useState<AttendanceResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<AttendanceResult[]>([]);

    const captureAndCheck = useCallback(async () => {
        if (!webcamRef.current) return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        try {
            const res = await fetch(imageSrc);
            const blob = await res.blob();
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

            const formData = new FormData();
            formData.append('file', file);

            const response = await api.post('/attendance/mark', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const result = response.data;
            setLastResult(result);
            setError(null);

            // Add to history
            setHistory(prev => {
                const newEntry = { 
                    ...result, 
                    displayTime: new Date().toISOString() 
                };
                return [newEntry, ...prev].slice(0, 10);
            });

        } catch (err: any) {
            const status = err.response?.status;
            const detail = err.response?.data?.detail;

            if (status === 409) {
                // Already marked for this period — show as amber warning, not red error
                setLastResult({ message: 'already_marked', student: detail });
                setError(null);
            } else if (status === 404) {
                setError('Face not recognized. Please register first.');
                setLastResult(null);
            } else if (status === 400) {
                // No face detected in auto mode — suppress silently
                setError(null);
            } else {
                setError(detail || 'Error connecting to server');
                setLastResult(null);
            }
        }
    }, []);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isScanning) {
            interval = setInterval(() => {
                captureAndCheck();
            }, 3000); // Check every 3 seconds
        }
        return () => clearInterval(interval);
    }, [isScanning, captureAndCheck]);

    return (
        <div className="container">
            <h2 style={{ marginBottom: '2rem' }}>Live Attendance</h2>

            <div className="grid">
                <div className="card">
                    <div className="webcam-container">
                        {isScanning ? (
                            <>
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    width="100%"
                                    height="100%"
                                    videoConstraints={{ facingMode: "user" }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '10px',
                                    background: 'rgba(239, 68, 68, 0.8)',
                                    color: 'white',
                                    padding: '5px 10px',
                                    borderRadius: '5px',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}>
                                    <Loader2 className="animate-spin" size={12} /> SCANNING
                                </div>
                            </>
                        ) : (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(0, 0, 0, 0.5)',
                                color: 'var(--text-muted)'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <Camera size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                    <p>Click "Start Scanning" to begin</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button
                            className={`btn ${isScanning ? 'btn-secondary' : ''}`}
                            onClick={() => setIsScanning(!isScanning)}
                            style={{ background: isScanning ? '#ef4444' : 'var(--primary)' }}
                        >
                            {isScanning ? <><Square size={20} /> Stop Scanning</> : <><Play size={20} /> Start Scanning</>}
                        </button>
                    </div>

                    <div style={{ marginTop: '1.5rem', textAlign: 'center', minHeight: '70px' }}>
                        {lastResult?.message === 'already_marked' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 700, color: '#eab308' }}>
                                    <span>⚠️</span> Already Marked
                                </div>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{lastResult.student}</span>
                            </div>
                        ) : lastResult ? (
                            <div style={{ color: 'var(--success)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    <CheckCircle size={24} />
                                    {lastResult.student}
                                </div>
                                <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>
                                    {lastResult.status || 'Present'}
                                    {lastResult.period ? ` · ${lastResult.period}` : ''}
                                    {lastResult.time ? ` · ${new Date(lastResult.time).toLocaleTimeString()}` : ''}
                                </span>
                                {lastResult.confidence != null && (
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                        Confidence: {lastResult.confidence}%
                                    </span>
                                )}
                            </div>
                        ) : error ? (
                            <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <XCircle size={20} /> {error}
                            </div>
                        ) : (
                            <div style={{ color: 'var(--text-muted)' }}>Ready to scan...</div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <h3>Recent Logs</h3>
                    {history.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No records yet</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Period</th>
                                    <th>Time</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((record, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 500 }}>{record.student}</td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{record.period || '—'}</td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {record.time ? new Date(record.time).toLocaleTimeString() : '—'}
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '0.2rem 0.65rem', borderRadius: '9999px',
                                                fontSize: '0.75rem', fontWeight: 600,
                                                background: record.status === 'Late' ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)',
                                                color: record.status === 'Late' ? '#eab308' : '#22c55e'
                                            }}>
                                                {record.status || 'Present'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Attendance;
