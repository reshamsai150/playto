import { useState } from 'react';
import api from '../api';

export default function CommentTree({ comment, refresh }) {
    const [showReply, setShowReply] = useState(false);
    const [replyContent, setReplyContent] = useState('');

    const handleLike = async () => {
        try {
            await api.post('likes/', { object_id: comment.id, type: 'comment' });
            if (refresh) refresh();
        } catch (err) {
            if (err.response?.status === 400) alert('Already liked!');
        }
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyContent.trim()) return;
        try {
            await api.post(`comments/${comment.id}/reply/`, { content: replyContent });
            setReplyContent('');
            setShowReply(false);
            if (refresh) refresh();
        } catch (err) {
            alert('Failed to reply');
        }
    };

    return (
        <div className="mt-4">
            <div className="flex gap-2">
                <div className="border-l-2 border-gray-200 ml-2"></div>
                <div className="flex-1">
                    <div className="bg-gray-50 p-3 rounded text-sm group">
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-gray-700">{comment.author}</span>
                            <span className="text-xs text-gray-400">
                                {new Date(comment.created_at).toLocaleTimeString()}
                            </span>
                        </div>
                        <p className="mb-2">{comment.content}</p>
                        <div className="flex gap-4 text-xs font-bold text-gray-500 mt-2">
                            <button onClick={handleLike} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                                👍 Like ({comment.like_count})
                            </button>
                            <button onClick={() => setShowReply(!showReply)} className="flex items-center gap-1 hover:text-gray-800 transition-colors">
                                ↪ Reply
                            </button>
                        </div>
                    </div>

                    {showReply && (
                        <form onSubmit={handleReply} className="mt-2 ml-4">
                            <textarea
                                autoFocus
                                className="w-full p-2 border rounded text-sm"
                                rows="2"
                                placeholder="Write a reply..."
                                value={replyContent}
                                onChange={e => setReplyContent(e.target.value)}
                            />
                            <button className="bg-gray-800 text-white text-xs px-3 py-1 rounded mt-1">
                                Reply
                            </button>
                        </form>
                    )}

                    {/* Recursion happens here */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="pl-4">
                            {comment.replies.map(reply => (
                                <CommentTree key={reply.id} comment={reply} refresh={refresh} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
