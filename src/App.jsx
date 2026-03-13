import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { getProfile } from './firebase/db';
import Layout from './components/Layout';
import Walkthrough from './components/Walkthrough';
import AuthPage from './pages/AuthPage';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Tracker from './pages/Tracker';
import MyModules from './pages/MyModules';
import StudyLog from './pages/StudyLog';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import { isNativePlatform } from './utils/nativeNotifications';

function reconcileTimerState(state) {
  if (!state || typeof state !== 'object') return state;
  if (!state.running) return state;

  const nowTs = Date.now();
  const lastTickAt = Number(state.lastTickAt || nowTs);
  const elapsedSec = Math.max(0, Math.floor((nowTs - lastTickAt) / 1000));
  if (elapsedSec <= 0) {
    return { ...state, lastTickAt: nowTs };
  }

  const nextSec = Math.max(0, Number(state.timerSec || 0) - elapsedSec);
  return {
    ...state,
    timerSec: nextSec,
    running: nextSec > 0,
    lastTickAt: nowTs,
  };
}

function FullPageStatus({ text }) {
  return (
    <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'var(--mono)', color:'var(--accent)', fontSize:13 }}>
      {text}
      <div style={{ position:'absolute', bottom:16, left:0, right:0, textAlign:'center', fontSize:10, letterSpacing:1.2, color:'var(--muted)', textTransform:'uppercase' }}>
        Powered by Tech Inspire SL
      </div>
    </div>
  );
}

function useOnboardingStatus() {
  const { user, loading } = useAuth();
  const location = useLocation();
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
  }, [user, loading, location.pathname]);

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
  const location = useLocation();
  const { loading, checking, onboardingSeen } = useOnboardingStatus();
  const allowReopen = new URLSearchParams(location.search).get('edit') === '1';

  if (loading || checking) return <FullPageStatus text="Loading..." />;
  if (onboardingSeen && !allowReopen) return <Navigate to="/" replace />;

  return <Onboarding />;
}

export default function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loading: onboardingLoading, checking: onboardingChecking, onboardingSeen } = useOnboardingStatus();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [timerForce, setTimerForce] = useState(0); // trigger re-renders

  useEffect(() => {
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setInstallPrompt(e);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Persistent timer across all pages — ticks every second
  useEffect(() => {
    const interval = setInterval(() => {
      const timerState = localStorage.getItem('bb-timer');
      if (!timerState) return;
      try {
        const parsed = JSON.parse(timerState);
        const nextState = reconcileTimerState(parsed);
        if (!nextState) return;

        const changed = JSON.stringify(parsed) !== JSON.stringify(nextState);
        if (changed) {
          localStorage.setItem('bb-timer', JSON.stringify(nextState));
          setTimerForce(c => c + 1);
        }
      } catch {
        // ignore malformed timer state
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Focus mode — warn before leaving during active session
  useEffect(() => {
    function handleBeforeUnload(e) {
      const timerState = localStorage.getItem('bb-timer');
      if (!timerState) return;
      const state = JSON.parse(timerState);
      const focusMode = localStorage.getItem('bb-focus-mode') === '1';
      
      if (focusMode && state.running && state.timerSec > 0) {
        e.preventDefault();
        e.returnValue = 'Your focus session is still running! Are you sure you want to leave?';
        return e.returnValue;
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Periodic focus notifications every 5 min during active timer
  useEffect(() => {
    if (isNativePlatform()) return;
    const notifInterval = setInterval(() => {
      const timerState = localStorage.getItem('bb-timer');
      if (!timerState) return;
      const state = JSON.parse(timerState);
      const focusMode = localStorage.getItem('bb-focus-mode') === '1';
      
      if (focusMode && state.running && state.timerSec > 0 && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const minRemaining = Math.ceil(state.timerSec / 60);
        const notif = new Notification('🎯 Stay Focused!', {
          body: `${minRemaining} min left. Keep going!`,
          tag: 'focus-reminder',
          requireInteraction: false,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    }, 300000); // Every 5 minutes
    return () => clearInterval(notifInterval);
  }, []);

  // Detect tab/window close during active session
  useEffect(() => {
    function handleVisibilityChange() {
      const timerState = localStorage.getItem('bb-timer');
      if (!timerState) return;
      const state = JSON.parse(timerState);
      
      if (document.hidden && state.running && state.activeIdx !== null) {
        localStorage.setItem('bb-session-abandoned', '1');
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Daily study reminder — fires browser notification at user-set time
  useEffect(() => {
    if (isNativePlatform()) return;
    const tick = setInterval(() => {
      const time = localStorage.getItem('bb-reminder');
      const on   = localStorage.getItem('bb-reminder-on') === '1';
      if (!on || !time) return;
      const [rh, rm] = time.split(':').map(Number);
      const now = new Date();
      if (now.getHours() === rh && now.getMinutes() === rm && now.getSeconds() < 30) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const notif = new Notification('BrainBlocks Study Reminder 📚', {
            body: "Time to study! Open BrainBlocks and start your focus session.",
            icon: '/icon.svg',
          });
          notif.onclick = () => {
            window.focus();
            navigate('/', { replace: true });
            notif.close();
          };
        }
      }
    }, 30000); // check every 30s
    return () => clearInterval(tick);
  }, [navigate]);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  return (
    <>
      <Walkthrough
        user={user}
        installPrompt={installPrompt}
        onInstall={handleInstall}
        enabled={Boolean(user) && onboardingSeen && !onboardingLoading && !onboardingChecking}
      />
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
    </>
  );
}
