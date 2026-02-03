import axios from 'axios';

const getBaseURL = () => {
    let url = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    // Clean trailing slash if present
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    return `${url}/api/`;
};

const api = axios.create({
    baseURL: getBaseURL(),
});

api.interceptors.request.use((config) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.token) { // If using token auth, but we implemented Basic/Session or just Login returning uer?
        // Wait, LoginView returns UserSerializer data.
        // We are using Session Authentication by default with Django.
        // But for API from separate frontend, we usually need Token or Session with Credentials.
        // Let's assume Session Auth with CSRF for MVP if on same domain, BUT we are on localhost:5173 vs 8000.
        // We enabled CORS allow all.
        // The simplest MVP auth for DRF is Token Authentication or just Basic.
        // "Auth: Django default email/password auth".
        // Let's stick to Basic Auth header or just passing username/password? No, that's bad.
        // I'll update LoginView to return a simple token or rely on SessionID cookie?
        // Cross-origin cookies are tricky without proper setup.
        // I'll add 'rest_framework.authtoken' to INSTALLED_APPS for safety? 
        // User Logic Scope said "Django default email/password auth".
        // I will assume we should just use Basic Auth encoded in the header for every request?
        // Or just Session.
        // Let's use Session and `withCredentials: true`.
        // And we need to fetch CSRF token.
    }
    return config;
}, (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
});

api.interceptors.response.use((response) => response, (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
});

// For MVP speed/correctness with "Default Auth", I'll use Basic Auth or Session.
// Let's try Session with credentials.
api.defaults.withCredentials = true;

export default api;
