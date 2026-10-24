import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import api from '../api';
import { Users, Camera, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface AttendanceResult {
    success: boolean;
    student_id?: string;
    student_name?: string;
    confidence?: number;
    time?: string;
    status?: string;
    already_marked?: boolean;
    error?: string;
    face_number?: number;
}

interface MultiAttendanceResponse {
    total_faces_detected: number;
    attendance_marked: number;
    results: AttendanceResult[];
}

const MultiFaceAttendance = () => {
    const webcamRef = useRef<Webcam>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<MultiAttendanceResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        setImgSrc(imageSrc || null);
        setResult(null);
        setError(null);
    }, []);

    const retake = () => {
        setImgSrc(null);
        setResult(null);
        setError(null);
    };

    const processAttendance = async () => {
        if (!imgSrc) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(imgSrc);
            const blob = await res.blob();
            const file = new File([blob], "group.jpg", { type: "image/jpeg" });

            const formData = new FormData();
            formData.append('file', file);

            const response = await api.post('/attendance/mark-multiple', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to process attendance');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <h2 style={{ marginBottom: '2rem' }}>
                <Users size={32} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Multi-Face Attendance
            </h2>

            <div className="grid">
                <div className="card">
                    <label style={{ marginBottom: '1rem', display: 'block', fontWeight: 'bold' }}>
                        Group Photo Capture
                    </label>
                    <div className="webcam-container">
                        {imgSrc ? (
                            <img src={imgSrc} alt="Captured Group" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                width="100%"
                                height="100%"
                                videoConstraints={{ facingMode: "user" }}
                            />
                        )}
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                        {!imgSrc ? (
                            <button onClick={capture} className="btn" style={{ width: '100%' }}>
                                <Camera size={20} /> Capture Group Photo
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={processAttendance} 
                                    className="btn" 
                                    style={{ width: '100%' }}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <><Loader2 className="animate-spin" size={20} /> Processing...</>
                                    ) : (
                                        <><Users size={20} /> Mark Attendance for All</>
                                    )}
                                </button>
                                <button onClick={retake} className="btn btn-secondary" style={{ width: '100%' }}>
                                    Retake Photo
                                </button>
                            </>
                        )}
                    </div>

                    {error && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444'
                        }}>
                            {error}
                        </div>
                    )}
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Results</h3>
                    
                    {result ? (
                        <>
                            <div style={{ 
                                padding: '1rem', 
                                background: 'rgba(99, 102, 241, 0.2)', 
                                borderRadius: '0.5rem',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6366f1' }}>
                                    {result.total_faces_detected} Faces Detected
                                </div>
                                <div style={{ fontSize: '1.2rem', color: '#22c55e', marginTop: '0.5rem' }}>
                                    {result.attendance_marked} Attendance Marked
                                </div>
                            </div>

                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {result.results.map((r, idx) => (
                                    <div 
                                        key={idx}
                                        style={{
                                            padding: '1rem',
                                            marginBottom: '0.75rem',
                                            borderRadius: '0.5rem',
                                            background: r.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            border: `1px solid ${r.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            {r.success ? (
                                                <CheckCircle size={24} style={{ color: '#22c55e', flexShrink: 0 }} />
                                            ) : (
                                                <XCircle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
                                            )}
                                            <div style={{ flex: 1 }}>
                                                {r.success ? (
                                                    <>
                                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                            {r.student_name}
                                                        </div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                            ID: {r.student_id} | Status: {r.status}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                                            Confidence: {((r.confidence || 0) * 100).toFixed(1)}%
                                                            {r.already_marked && ' (Already marked today)'}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div style={{ fontWeight: 'bold' }}>
                                                            Face #{r.face_number}
                                                        </div>
                                                        <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>
                                                            {r.error}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <Users size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p>Capture a group photo to mark attendance for multiple students at once</p>
                            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                All visible faces will be detected and matched
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MultiFaceAttendance;
