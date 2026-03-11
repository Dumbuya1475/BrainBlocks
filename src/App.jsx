import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { getProfile } from './firebase/db';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Tracker from './pages/Tracker';
import MyModules from './pages/MyModules';
import StudyLog from './pages/StudyLog';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';

function FullPageStatus({ text }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'var(--mono)', color:'var(--accent)', fontSize:13 }}>
      {text}
    </div>
  );
}

function useOnboardingStatus() {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [onboardingSeen, setOnboardingSeen] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkProfile() {
      if (loading) return;
      if (!user?.uid) {
        if (active) {
          setOnboardingSeen(true);
          setChecking(false);
        }
        return;
      }

      setChecking(true);
      try {
        const profile = await getProfile(user.uid);
        if (active) setOnboardingSeen(Boolean(profile?.onboardingSeen));
      } catch {
        if (active) setOnboardingSeen(true);
      } finally {
        if (active) setChecking(false);
      }
    }

    checkProfile();
    return () => { active = false; };
  }, [user, loading]);

  return { user, loading, checking, onboardingSeen };
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageStatus text="Loading..." />;
  return user ? children : <Navigate to="/auth" replace />;
}

function RequireOnboarding({ children }) {
  const { loading, checking, onboardingSeen } = useOnboardingStatus();
  if (loading || checking) return <FullPageStatus text="Loading..." />;
  return onboardingSeen ? children : <Navigate to="/onboarding" replace />;
}

function OnboardingRoute() {
  const { loading, checking, onboardingSeen } = useOnboardingStatus();
  if (loading || checking) return <FullPageStatus text="Loading..." />;
  return onboardingSeen ? <Navigate to="/" replace /> : <Onboarding />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/u/:uid" element={<PublicProfile />} />
      <Route path="/onboarding" element={<PrivateRoute><OnboardingRoute /></PrivateRoute>} />
      <Route path="/" element={<PrivateRoute><RequireOnboarding><Layout /></RequireOnboarding></PrivateRoute>}>
        <Route index        element={<Dashboard />} />
        <Route path="track" element={<Tracker />} />
        <Route path="modules" element={<MyModules />} />
        <Route path="log"   element={<StudyLog />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
