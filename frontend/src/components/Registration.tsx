import { useState, useRef, useCallback } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Webcam from 'react-webcam';
import api from '../api';
import { Camera, UserPlus, Loader2 } from 'lucide-react';

const Registration = () => {
    const webcamRef = useRef<Webcam>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [webcamReady, setWebcamReady] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        student_id: '',
        email: '',
        course: '',
        enrollment_date: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const capture = useCallback(() => {
        if (!webcamRef.current) {
            setMessage({ type: 'error', text: 'Camera not ready. Please wait...' });
            return;
        }
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
            setMessage({ type: 'error', text: 'Failed to capture image. Please try again.' });
            return;
        }
        setImgSrc(imageSrc);
        setMessage(null);
    }, []);

    const retake = () => {
        setImgSrc(null);
        setMessage(null);
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!imgSrc) {
            setMessage({ type: 'error', text: 'Please capture a photo first' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            // Convert base64 to blob
            const res = await fetch(imgSrc);
            const blob = await res.blob();
            const file = new File([blob], "face.jpg", { type: "image/jpeg" });

            const data = new FormData();
            data.append('name', formData.name);
            data.append('student_id', formData.student_id);
            data.append('email', formData.email);
            data.append('course', formData.course);
            data.append('enrollment_date', formData.enrollment_date);
            data.append('file', file);

            await api.post('/students/', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setMessage({ type: 'success', text: 'Student registered successfully!' });
            setFormData({
                name: '',
                student_id: '',
                email: '',
                course: '',
                enrollment_date: new Date().toISOString().split('T')[0]
            });
            setImgSrc(null);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.detail || 'Registration failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <h2 style={{ marginBottom: '2rem' }}>Student Registration</h2>

            <div className="grid">
                <div className="card">
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label>Full Name</label>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="input-group">
                            <label>Student ID (Roll No)</label>
                            <input
                                name="student_id"
                                value={formData.student_id}
                                onChange={handleChange}
                                required
                                placeholder="STU-001"
                            />
                        </div>
                        <div className="input-group">
                            <label>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="student@example.com"
                            />
                        </div>
                        <div className="input-group">
                            <label>Course</label>
                            <input
                                name="course"
                                value={formData.course}
                                onChange={handleChange}
                                required
                                placeholder="Computer Science"
                            />
                        </div>
                        <div className="input-group">
                            <label>Enrollment Date</label>
                            <input
                                type="date"
                                name="enrollment_date"
                                value={formData.enrollment_date}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : <UserPlus />}
                            {loading ? 'Registering...' : 'Register Student'}
                        </button>
                    </form>

                    {message && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            background: message.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                            color: message.type === 'error' ? '#ef4444' : '#22c55e'
                        }}>
                            {message.text}
                        </div>
                    )}
                </div>

                <div className="card">
                    <label style={{ marginBottom: '1rem', display: 'block' }}>Face Capture</label>
                    <div className="webcam-container">
                        {imgSrc ? (
                            <img src={imgSrc} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                width="100%"
                                height="100%"
                                videoConstraints={{ facingMode: "user" }}
                                onUserMedia={() => setWebcamReady(true)}
                                onUserMediaError={() => {
                                    setMessage({ type: 'error', text: 'Camera access denied. Please enable camera permissions.' });
                                    setWebcamReady(false);
                                }}
                            />
                        )}
                    </div>
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', width: '100%' }}>
                        {!imgSrc ? (
                            <button 
                                type="button" 
                                onClick={capture} 
                                className="btn" 
                                style={{ flex: 1 }}
                                disabled={!webcamReady}
                            >
                                <Camera size={20} /> {webcamReady ? 'Capture' : 'Waiting for camera...'}
                            </button>
                        ) : (
                            <button type="button" onClick={retake} className="btn btn-secondary" style={{ flex: 1 }}>
                                Retake
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Registration;
