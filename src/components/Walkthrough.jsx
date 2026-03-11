import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getProfile, saveProfile } from '../firebase/db';

const STEPS = [
  {
    id: 'home-select',
    path: '/',
    selector: '[data-tour="dashboard-module"]',
    title: 'Step 1: Pick a study block',
    text: 'Tap one module from this list to load it into the focus timer.',
    cta: 'Next',
    requireInteraction: true,
  },
  {
    id: 'home-start',
    path: '/',
    selector: '[data-tour="dashboard-start"]',
    title: 'Step 2: Start focus timer',
    text: 'Tap START to begin your focus session.',
    cta: 'Go to Modules',
    requireInteraction: true,
  },
  {
    id: 'modules-open',
    path: '/modules',
    selector: '[data-tour="modules-add"]',
    title: 'Step 3: Add your module',
    text: 'Tap Add New Module to open the module form.',
    cta: 'Next',
    requireInteraction: true,
  },
  {
    id: 'modules-generate',
    path: '/modules',
    selector: '[data-tour="modules-generate"]',
    title: 'Step 4: Generate roadmap',
    text: 'After filling module details, tap Generate AI Roadmap.',
    cta: 'Go to Tracker',
    requireInteraction: true,
  },
  {
    id: 'tracker-module',
    path: '/track',
    selector: '[data-tour="tracker-module"]',
    title: 'Step 5: Follow the roadmap',
    text: 'Select a module roadmap. Every generated module roadmap becomes a week-by-week tracker so you can check off tasks as you progress.',
    cta: 'Next',
    requireInteraction: true,
  },
  {
    id: 'tracker-task',
    path: '/track',
    selector: '[data-tour="tracker-task"]',
    title: 'Step 6: Check tasks',
    text: 'Tap a task to mark it done and keep your momentum visible.',
    cta: 'Go to Profile',
    requireInteraction: true,
  },
  {
    id: 'profile-share',
    path: '/profile',
    selector: '[data-tour="profile-share"]',
    title: 'Step 7: Share your profile',
    text: 'Use this button when you want to share your study progress publicly.',
    cta: 'Final step',
    requireInteraction: false,
  },
  {
    id: 'install',
    path: '/profile',
    title: 'Install BrainBlocks',
    text: 'Install BrainBlocks for a smooth app-like experience and quicker daily access.',
    cta: 'Finish',
    requireInteraction: false,
  },
];

export default function Walkthrough({ user, installPrompt, onInstall, enabled }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const currentStep = STEPS[stepIndex];

  useEffect(() => {
    let active = true;

    async function loadWalkthroughState() {
      if (!enabled || !user?.uid) {
        if (active) setVisible(false);
        return;
      }

      try {
        const profile = await getProfile(user.uid);
        if (!active) return;
        setVisible(!profile?.walkthroughSeen);
      } catch {
        if (active) setVisible(false);
      }
    }

    loadWalkthroughState();
    return () => { active = false; };
  }, [enabled, user]);

  useEffect(() => {
    if (!visible || !currentStep) return;
    if (location.pathname !== currentStep.path) {
      navigate(currentStep.path, { replace: true });
    }
  }, [visible, currentStep, location.pathname, navigate]);

  useEffect(() => {
    if (!visible || !currentStep?.selector) {
      setTargetRect(null);
      setInteracted(!currentStep?.requireInteraction);
      return;
    }

    let cleanup = () => {};
    let raf = 0;

    const updateTarget = () => {
      const target = document.querySelector(currentStep.selector);
      document.querySelectorAll('.tour-highlight').forEach(node => node.classList.remove('tour-highlight'));

      if (!target) {
        setTargetRect(null);
        return;
      }

      target.classList.add('tour-highlight');
      target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);

      const onClick = () => setInteracted(true);
      target.addEventListener('click', onClick, { once: true });
      cleanup = () => {
        target.classList.remove('tour-highlight');
        target.removeEventListener('click', onClick);
      };
    };

    setInteracted(!currentStep.requireInteraction);
    updateTarget();

    const onReflow = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateTarget);
    };

    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
      cleanup();
      document.querySelectorAll('.tour-highlight').forEach(node => node.classList.remove('tour-highlight'));
    };
  }, [visible, currentStep]);

  const progress = useMemo(() => ((stepIndex + 1) / STEPS.length) * 100, [stepIndex]);

  const tooltipStyle = useMemo(() => {
    if (!targetRect) {
      return {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 460,
        width: 'min(92vw, 360px)',
      };
    }

    const viewportW = window.innerWidth;
    const tooltipWidth = Math.min(360, viewportW - 24);
    const left = Math.min(Math.max(12, targetRect.left), viewportW - tooltipWidth - 12);
    const prefersTop = targetRect.bottom + 220 > window.innerHeight;
    const top = prefersTop ? Math.max(12, targetRect.top - 220) : Math.min(window.innerHeight - 220, targetRect.bottom + 12);

    return {
      position: 'fixed',
      left,
      top,
      zIndex: 460,
      width: tooltipWidth,
    };
  }, [targetRect]);

  async function finish() {
    if (user?.uid) {
      try {
        await saveProfile(user.uid, {
          walkthroughSeen: true,
          walkthroughSeenAt: new Date().toISOString(),
        });
      } catch {}
    }
    setVisible(false);
    setStepIndex(0);
  }

  if (!visible || !currentStep) return null;

  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:430, pointerEvents:'none' }} />
      <div className="modal slide-up" style={tooltipStyle}>
        <div className="card-label">🧭 Interactive Walkthrough</div>
        <h3>{currentStep.title}</h3>
        <p style={{ color:'var(--muted)', lineHeight:1.7, marginBottom:18 }}>{currentStep.text}</p>
        <div style={{ height:8, borderRadius:99, background:'var(--border)', overflow:'hidden', marginBottom:18 }}>
          <div style={{ width:`${progress}%`, height:'100%', background:'linear-gradient(90deg, var(--accent), var(--accent2))' }} />
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {currentStep.id === 'install' && (
            <button className="btn btn-ghost" type="button" onClick={onInstall}>
              {installPrompt ? 'Install App' : 'Install Later'}
            </button>
          )}
          {stepIndex > 0 && (
            <button className="btn btn-ghost" type="button" onClick={() => setStepIndex(s => s - 1)}>
              Back
            </button>
          )}
          {stepIndex < STEPS.length - 1 ? (
            <button className="btn btn-primary" type="button" disabled={currentStep.requireInteraction && !interacted} onClick={() => setStepIndex(s => s + 1)}>
              {currentStep.cta}
            </button>
          ) : (
            <button className="btn btn-primary" type="button" onClick={finish}>
              {currentStep.cta}
            </button>
          )}
          <button className="btn btn-ghost" type="button" onClick={finish}>Skip Tour</button>
        </div>
      </div>
    </>
  );
}
