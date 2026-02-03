import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import PostDetail from './pages/PostDetail';

function App() {
  const user = JSON.parse(localStorage.getItem('user'));

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={user ? <Feed /> : <Navigate to="/login" />}
        />
        <Route
          path="/post/:id"
          element={user ? <PostDetail /> : <Navigate to="/login" />}
        />
      </Routes>
    </div>
  );
}

export default App;
