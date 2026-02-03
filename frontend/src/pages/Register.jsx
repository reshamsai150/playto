import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Register() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('auth/register/', { username, password });
            localStorage.setItem('user', JSON.stringify(res.data));
            window.location.href = '/';
        } catch (error) {
            alert('Registration failed');
        }
    };

    return (
        <div className="flex items-center justify-center h-screen">
            <form onSubmit={handleRegister} className="p-8 bg-white rounded shadow-md w-96">
                <h2 className="mb-4 text-2xl font-bold">Register</h2>
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
                <button className="w-full p-2 text-white bg-green-500 rounded hover:bg-green-600">
                    Sign Up
                </button>
                <p className="mt-4 text-sm text-center">
                    Already have an account? <Link to="/login" className="text-blue-500">Login</Link>
                </p>
            </form>
        </div>
    );
}
