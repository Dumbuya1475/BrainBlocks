import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Tracker from './pages/Tracker';
import MyModules from './pages/MyModules';
import StudyLog from './pages/StudyLog';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'var(--mono)', color:'var(--accent)', fontSize:13 }}>
      Loading...
    </div>
  );
  return user ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/u/:uid" element={<PublicProfile />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index        element={<Dashboard />} />
        <Route path="track" element={<Tracker />} />
        <Route path="modules" element={<MyModules />} />
        <Route path="log"   element={<StudyLog />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
