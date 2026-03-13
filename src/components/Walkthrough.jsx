import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getProfile, saveProfile } from '../firebase/db';

const STEPS = [
  {
    id: 'home-select',
    path: '/',
    selector: '[data-tour="dashboard-module"]',
    title: '👆 Pick a study block',
    text: 'Tap any module from this list to load it into the focus timer below.',
  },
  {
    id: 'home-start',
    path: '/',
    selector: '[data-tour="dashboard-start"]',
    title: '⏱ Start focus timer',
    text: 'Tap START to begin a timed focus session for the selected module.',
  },
  {
    id: 'modules-open',
    path: '/modules',
    selector: '[data-tour="modules-add"]',
    title: '➕ Add your first module',
    text: 'Tap this button to open the module form and create your own study subject.',
  },
  {
    id: 'modules-generate',
    path: '/modules',
    selector: '[data-tour="modules-generate"]',
    title: '🤖 Generate AI roadmap',
    text: 'After filling in your module details, tap here to generate a week-by-week AI study plan.',
  },
  {
    id: 'tracker-module',
    path: '/track',
    selector: '[data-tour="tracker-module"]',
    title: '📅 Choose a roadmap to track',
    text: 'Each module with a roadmap appears here. Select one to see all your weekly tasks.',
  },
  {
    id: 'tracker-task',
    path: '/track',
    selector: '[data-tour="tracker-task"]',
    title: '✅ Check off tasks',
    text: 'Tap any task to mark it done. Your progress is saved automatically.',
  },
  {
    id: 'log-add',
    path: '/log',
    selector: '[data-tour="log-add"]',
    title: '📓 Log your study session',
    text: 'After each study session, tap here to record what you studied, how long, and your mood.',
  },
  {
    id: 'profile-save',
    path: '/profile',
    selector: '[data-tour="profile-save"]',
    title: '👤 Complete your profile',
    text: 'Add your university and program details, then save — this powers your public share card.',
  },
  {
    id: 'profile-share',
    path: '/profile',
    selector: '[data-tour="profile-share"]',
    title: '🌐 Share your progress',
    text: 'Enable a public profile to share your study stats with classmates.',
  },
  {
    id: 'install',
    path: '/profile',
    selector: null,
    title: '📲 Install BrainBlocks',
    text: 'Add BrainBlocks to your home screen for faster access and an app-like experience.',
  },
];

function Arrow({ placement }) {
  const size = 10;
  const color = 'var(--surface)';
  const border = 'var(--border)';

  const styles = {
    top: {
      position: 'absolute', top: -size, left: '50%',
      transform: 'translateX(-50%)',
      width: 0, height: 0,
      borderLeft: `${size}px solid transparent`,
      borderRight: `${size}px solid transparent`,
      borderBottom: `${size}px solid ${color}`,
      filter: `drop-shadow(0 -1px 0 ${border})`,
    },
    bottom: {
      position: 'absolute', bottom: -size, left: '50%',
      transform: 'translateX(-50%)',
      width: 0, height: 0,
      borderLeft: `${size}px solid transparent`,
      borderRight: `${size}px solid transparent`,
      borderTop: `${size}px solid ${color}`,
      filter: `drop-shadow(0 1px 0 ${border})`,
    },
    left: {
      position: 'absolute', left: -size, top: '50%',
      transform: 'translateY(-50%)',
      width: 0, height: 0,
      borderTop: `${size}px solid transparent`,
      borderBottom: `${size}px solid transparent`,
      borderRight: `${size}px solid ${color}`,
      filter: `drop-shadow(-1px 0 0 ${border})`,
    },
    right: {
      position: 'absolute', right: -size, top: '50%',
      transform: 'translateY(-50%)',
      width: 0, height: 0,
      borderTop: `${size}px solid transparent`,
      borderBottom: `${size}px solid transparent`,
      borderLeft: `${size}px solid ${color}`,
      filter: `drop-shadow(1px 0 0 ${border})`,
    },
  };

  if (!placement || !styles[placement]) return null;
  return <div style={styles[placement]} />;
}

function calcTooltip(targetRect) {
  const PAD = 14;
  const TIP = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const W = Math.min(300, vw - PAD * 2);

  if (!targetRect) {
    return {
      left: vw / 2 - W / 2,
      top: vh / 2 - 100,
      width: W,
      arrow: null,
    };
  }

  const cx = targetRect.left + targetRect.width / 2;
  const spaceBelow = vh - targetRect.bottom;
  const spaceAbove = targetRect.top;

  let left = Math.max(PAD, Math.min(cx - W / 2, vw - W - PAD));
  let top, arrow;

  if (spaceBelow >= 180 || spaceBelow >= spaceAbove) {
    top = targetRect.bottom + TIP + 4;
    arrow = 'top';
  } else {
    top = targetRect.top - TIP - 4;
    top = top - 180;
    if (top < PAD) top = PAD;
    arrow = 'bottom';
  }

  return { left, top, width: W, arrow };
}

export default function Walkthrough({ user, installPrompt, onInstall, enabled }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const walkthroughInitForUidRef = useRef('');
  const currentStep = STEPS[stepIndex];
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  // Load whether tour was already seen
  useEffect(() => {
    let active = true;
    async function load() {
      if (!user?.uid) {
        walkthroughInitForUidRef.current = '';
        if (active) {
          setVisible(false);
          setStepIndex(0);
        }
        return;
      }

      if (!enabled) return;
      if (walkthroughInitForUidRef.current === user.uid) return;

      try {
        const profile = await getProfile(user.uid);
        if (!active) return;
        walkthroughInitForUidRef.current = user.uid;
        if (!profile?.walkthroughSeen) {
          setStepIndex(0);
          setVisible(true);
        } else {
          setVisible(false);
        }
      } catch { if (active) setVisible(false); }
    }
    load();
    return () => { active = false; };
  }, [enabled, user?.uid]);

  // Navigate to the right route for current step
  useEffect(() => {
    if (!visible || !currentStep) return;
    if (location.pathname !== currentStep.path) {
      navigate(currentStep.path, { replace: true });
    }
  }, [visible, currentStep?.path, location.pathname, navigate]);

  // Highlight target element and measure its rect
  useEffect(() => {
    if (!visible) return;
    if (!currentStep?.selector) {
      document.querySelectorAll('.tour-highlight').forEach(n => n.classList.remove('tour-highlight'));
      setTargetRect(null);
      return;
    }

    let raf = 0;
    let tries = 0;
    let retryTimer = 0;
    let cleanup = () => {};

    const attach = () => {
      document.querySelectorAll('.tour-highlight').forEach(n => n.classList.remove('tour-highlight'));
      const el = document.querySelector(currentStep.selector);
      if (!el) {
        setTargetRect(null);
        if (tries < 16) {
          tries += 1;
          retryTimer = window.setTimeout(attach, 140);
        }
        return;
      }

      el.classList.add('tour-highlight');
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setTargetRect(el.getBoundingClientRect());

      cleanup = () => {
        el.classList.remove('tour-highlight');
      };
    };

    const onReflow = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = document.querySelector(currentStep.selector);
        if (el) setTargetRect(el.getBoundingClientRect());
      });
    };

    // small delay so the route/render settles first
    const timer = setTimeout(attach, 120);
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);

    return () => {
      clearTimeout(timer);
      clearTimeout(retryTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
      cleanup();
      document.querySelectorAll('.tour-highlight').forEach(n => n.classList.remove('tour-highlight'));
    };
  }, [visible, stepIndex, location.pathname]);

  // Recalculate tooltip position whenever targetRect changes
  useEffect(() => {
    setTooltip(calcTooltip(targetRect));
  }, [targetRect]);

  async function finish() {
    if (user?.uid) {
      try { await saveProfile(user.uid, { walkthroughSeen: true, walkthroughSeenAt: new Date().toISOString() }); } catch {}
    }
    document.querySelectorAll('.tour-highlight').forEach(n => n.classList.remove('tour-highlight'));
    setVisible(false);
    setStepIndex(0);
  }

  function next() {
    if (stepIndex < STEPS.length - 1) setStepIndex(s => s + 1);
    else finish();
  }

  if (!visible || !currentStep || !tooltip) return null;

  return (
    <>
      {/* dim overlay — non-blocking so target element is still clickable */}
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', zIndex:430, pointerEvents:'none' }} />

      {/* tooltip bubble */}
      <div
        className="slide-up"
        style={{
          position: 'fixed',
          left: tooltip.left,
          top: tooltip.top,
          width: tooltip.width,
          zIndex: 460,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '16px 16px 14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        }}
      >
        <Arrow placement={tooltip.arrow} />

        {/* header row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1.5 }}>
            {stepIndex + 1} / {STEPS.length}
          </div>
          <button
            type="button"
            onClick={finish}
            style={{ background:'none', border:'none', color:'var(--muted)', fontSize:16, cursor:'pointer', lineHeight:1, padding:0 }}
            aria-label="Close tour"
          >
            ✕
          </button>
        </div>

        {/* title + text */}
        <div style={{ fontWeight:800, fontSize:14, marginBottom:6, fontFamily:'var(--sans)' }}>{currentStep.title}</div>
        <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.65, margin:0, marginBottom:12 }}>{currentStep.text}</p>

        {/* progress bar */}
        <div style={{ height:4, borderRadius:99, background:'var(--border)', overflow:'hidden', marginBottom:12 }}>
          <div style={{ width:`${progress}%`, height:'100%', background:'linear-gradient(90deg, var(--accent), var(--accent2))', transition:'width 0.3s ease' }} />
        </div>

        {/* actions */}
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {stepIndex > 0 && (
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setStepIndex(s => s - 1)}>← Back</button>
          )}
          {currentStep.id === 'install' && installPrompt && (
            <button className="btn btn-ghost btn-sm" type="button" onClick={onInstall}>Install</button>
          )}
          <button className="btn btn-primary btn-sm" type="button" onClick={next} style={{ marginLeft:'auto' }}>
            {stepIndex < STEPS.length - 1 ? `${currentStep.cta || 'Next'} →` : 'Finish ✓'}
          </button>
        </div>
      </div>
    </>
  );
}
