import { useEffect, useState } from 'react';
import api from '../api';
import PostItem from '../components/PostItem';
import Leaderboard from '../components/Leaderboard';
import { useNavigate } from 'react-router-dom';

export default function Feed() {
    const [posts, setPosts] = useState([]);
    const [content, setContent] = useState('');
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = () => {
        api.get('posts/').then(res => setPosts(res.data));
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;
        try {
            await api.post('posts/', { content });
            setContent('');
            fetchPosts();
        } catch (err) {
            alert('Failed to post');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="max-w-4xl mx-auto p-4 flex gap-6">
            <div className="flex-1">
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Playto Feed</h1>
                    <div className="flex items-center gap-4">
                        <span className="font-semibold">Hi, {user?.username}</span>
                        <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">Logout</button>
                    </div>
                </header>

                <form onSubmit={handleCreate} className="bg-white p-4 rounded shadow mb-6">
                    <textarea
                        className="w-full p-2 border rounded resize-none mb-2"
                        rows="3"
                        placeholder="What's on your mind?"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                    />
                    <div className="text-right">
                        <button className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700">
                            Post
                        </button>
                    </div>
                </form>

                <div>
                    {posts.map(post => (
                        <PostItem key={post.id} post={post} refresh={fetchPosts} />
                    ))}
                </div>
            </div>

            <div className="w-64 shrink-0">
                <Leaderboard />
            </div>
        </div>
    );
}
