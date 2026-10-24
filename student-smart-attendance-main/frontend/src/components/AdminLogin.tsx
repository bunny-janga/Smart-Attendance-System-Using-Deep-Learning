import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Lock, User } from 'lucide-react';

const AdminLogin = () => {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/admin/login', credentials);
            localStorage.setItem('admin', JSON.stringify(response.data));
            navigate('/admin/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'var(--background)'
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', margin: '2rem' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Admin Login</h2>
                
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label><User size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />Username</label>
                        <input
                            value={credentials.username}
                            onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                            required
                            placeholder="Enter username"
                        />
                    </div>

                    <div className="input-group">
                        <label><Lock size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />Password</label>
                        <input
                            type="password"
                            value={credentials.password}
                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                            required
                            placeholder="Enter password"
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            marginBottom: '1rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <p>Default credentials: admin / admin123</p>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
