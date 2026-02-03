import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import CommentTree from './CommentTree';

export default function PostItem({ post, refresh }) {
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState(null);
    const [commentContent, setCommentContent] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);

    const handleLike = async () => {
        try {
            await api.post('likes/', { object_id: post.id, type: 'post' });
            if (refresh) refresh();
        } catch (err) {
            if (err.response?.status === 400) alert('Already liked!');
            else alert('Error liking post');
        }
    };

    const toggleComments = async () => {
        if (!showComments && !comments) {
            setLoadingComments(true);
            try {
                const res = await api.get(`posts/${post.id}/comments/`);
                setComments(res.data);
            } catch (err) {
                console.error("Failed to fetch comments");
            } finally {
                setLoadingComments(false);
            }
        }
        setShowComments(!showComments);
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentContent.trim()) return;
        try {
            await api.post(`posts/${post.id}/comments/`, { content: commentContent });
            setCommentContent('');
            // Refresh comments
            const res = await api.get(`posts/${post.id}/comments/`);
            setComments(res.data);
        } catch (err) {
            alert('Failed to comment');
        }
    };

    const refreshComments = async () => {
        const res = await api.get(`posts/${post.id}/comments/`);
        setComments(res.data);
    };


    return (
        <div className="bg-white p-4 mb-4 rounded shadow border border-gray-200">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-gray-500 mb-1">
                        Posted by <span className="font-semibold text-blue-600">{post.author}</span>
                    </p>
                    <Link to={`/post/${post.id}`} className="text-xl font-bold hover:underline block mb-2 text-gray-900">
                        {post.content}
                    </Link>
                </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mt-2 border-t pt-2 border-gray-100">
                <button
                    onClick={handleLike}
                    className="flex items-center gap-1 font-bold hover:text-blue-600 transition-colors px-2 py-1 rounded hover:bg-gray-50"
                >
                    👍 Like ({post.like_count})
                </button>
                <button
                    onClick={toggleComments}
                    className="flex items-center gap-1 font-bold hover:text-gray-900 transition-colors px-2 py-1 rounded hover:bg-gray-50"
                >
                    💬 Comments
                </button>
            </div>

            {showComments && (
                <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                    <form onSubmit={handleCommentSubmit} className="mb-4 flex gap-2">
                        <input
                            className="flex-1 p-2 border rounded text-sm focus:outline-none focus:border-blue-500"
                            placeholder="Write a comment..."
                            value={commentContent}
                            onChange={e => setCommentContent(e.target.value)}
                        />
                        <button className="bg-blue-600 text-white px-4 py-1 rounded text-sm font-semibold hover:bg-blue-700">
                            Post
                        </button>
                    </form>

                    {loadingComments ? (
                        <p className="text-sm text-gray-500">Loading comments...</p>
                    ) : (
                        <div className="space-y-4">
                            {comments && comments.map(comment => (
                                <CommentTree key={comment.id} comment={comment} refresh={refreshComments} />
                            ))}
                            {comments?.length === 0 && (
                                <p className="text-sm text-gray-400 italic">No comments yet.</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
