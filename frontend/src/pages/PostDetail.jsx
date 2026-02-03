import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import PostItem from '../components/PostItem';
import CommentTree from '../components/CommentTree';

export default function PostDetail() {
    const { id } = useParams();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentContent, setCommentContent] = useState('');

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        const postRes = await api.get(`posts/${id}/`);
        setPost(postRes.data);
        const commentsRes = await api.get(`posts/${id}/comments/`);
        setComments(commentsRes.data);
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!commentContent.trim()) return;
        try {
            await api.post(`posts/${id}/comments/`, { content: commentContent });
            setCommentContent('');
            fetchData();
        } catch (err) {
            alert('Failed to comment');
        }
    };

    if (!post) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto p-4">
            <Link to="/" className="text-blue-500 mb-4 inline-block">← Back to Feed</Link>

            <PostItem post={post} refresh={fetchData} />

            <div className="mt-8">
                <h3 className="font-bold text-lg mb-4">Comments</h3>

                <form onSubmit={handleComment} className="mb-6">
                    <textarea
                        className="w-full p-2 border rounded resize-none mb-2"
                        rows="2"
                        placeholder="Add a comment..."
                        value={commentContent}
                        onChange={e => setCommentContent(e.target.value)}
                    />
                    <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                        Comment
                    </button>
                </form>

                <div>
                    {comments.map(comment => (
                        <CommentTree key={comment.id} comment={comment} refresh={fetchData} />
                    ))}
                </div>
            </div>
        </div>
    );
}
