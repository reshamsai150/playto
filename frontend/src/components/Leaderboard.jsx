import { useEffect, useState } from 'react';
import api from '../api';

export default function Leaderboard() {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        api.get('leaderboard/').then(res => setUsers(res.data));
        const interval = setInterval(() => {
            api.get('leaderboard/').then(res => setUsers(res.data));
        }, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-white p-4 rounded shadow">
            <h3 className="font-bold text-lg mb-4">🏆 Top Users (24h)</h3>
            <div className="space-y-3">
                {users.map((u, i) => {
                    let rankIcon = `#${i + 1}`;
                    if (i === 0) rankIcon = '🥇';
                    if (i === 1) rankIcon = '🥈';
                    if (i === 2) rankIcon = '🥉';

                    return (
                        <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-xl w-8 text-center">{rankIcon}</span>
                                <span className="font-semibold text-gray-800">{u.receiver__username}</span>
                            </div>
                            <span className="font-bold text-blue-600 text-sm">{u.karma} karma</span>
                        </div>
                    );
                })}
            </div>
            {users.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No activity yet. Be the first!</p>}
        </div>
    );
}
