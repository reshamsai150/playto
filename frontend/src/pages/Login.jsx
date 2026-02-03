import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('auth/login/', { username, password });
            localStorage.setItem('user', JSON.stringify(res.data));
            window.location.href = '/'; // Force reload to update app state
        } catch (error) {
            alert('Login failed');
        }
    };

    return (
        <div className="flex items-center justify-center h-screen">
            <form onSubmit={handleLogin} className="p-8 bg-white rounded shadow-md w-96">
                <h2 className="mb-4 text-2xl font-bold">Login</h2>
                <input
                    className="w-full p-2 mb-4 border rounded"
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                />
                <input
                    className="w-full p-2 mb-4 border rounded"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <button className="w-full p-2 text-white bg-blue-500 rounded hover:bg-blue-600">
                    Login
                </button>
                <p className="mt-4 text-sm text-center">
                    Don't have an account? <Link to="/register" className="text-blue-500">Sign up</Link>
                </p>
            </form>
        </div>
    );
}
