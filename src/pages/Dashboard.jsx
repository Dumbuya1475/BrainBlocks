import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getModules, getProgress, saveProgress } from '../firebase/db';
import { DEFAULT_MODULES } from '../data/curriculum';
import { Notif, useNotif } from '../components/Notif';

export default function Dashboard() {
  const { user } = useAuth();
  const { notif, showNotif } = useNotif();

  const [modules,  setModules]  = useState([]);
  const [progress, setProgress] = useState({ sessions:{}, tasks:{}, lastReset:'' });
  const [loading,  setLoading]  = useState(true);

  // Timer state
  const [activeIdx,    setActiveIdx]    = useState(null);
  const [timerSec,     setTimerSec]     = useState(0);
  const [timerTotal,   setTimerTotal]   = useState(0);
  const [running,      setRunning]      = useState(false);
  const intervalRef = useRef(null);

  // Clock
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => { loadData(); }, [user]);

  async function loadData() {
    setLoading(true);
    const [mods, prog] = await Promise.all([getModules(user.uid), getProgress(user.uid)]);
    const today = new Date().toDateString();
    let p = prog;
    if (p.lastReset !== today) { p = { ...p, sessions:{}, lastReset: today }; await saveProgress(user.uid, p); }
    setModules(mods.length > 0 ? mods : DEFAULT_MODULES);
    setProgress(p);
    setLoading(false);
  }

  function selectModule(idx) {
    if (running) return;
    const m = modules[idx];
    setActiveIdx(idx);
    const secs = (m.duration || 30) * 60;
    setTimerSec(secs);
    setTimerTotal(secs);
  }

  function toggleTimer() {
    if (activeIdx === null) { showNotif('Pick a study block first!', 'error'); return; }
    if (running) {
      clearInterval(intervalRef.current);
      setRunning(false);
    } else {
      intervalRef.current = setInterval(() => {
        setTimerSec(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            showNotif("⏰ Time's up! Great work!");
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      setRunning(true);
    }
  }

  function resetTimer() {
    clearInterval(intervalRef.current);
    setRunning(false);
    if (activeIdx !== null) {
      const secs = (modules[activeIdx]?.duration || 30) * 60;
      setTimerSec(secs); setTimerTotal(secs);
    }
  }

  async function markDone() {
    if (activeIdx === null) return;
    const key = modules[activeIdx]?.id || modules[activeIdx]?.name;
    const updated = { ...progress, sessions: { ...progress.sessions, [key]: true } };
    setProgress(updated);
    await saveProgress(user.uid, updated);
    clearInterval(intervalRef.current);
    setRunning(false);
    setActiveIdx(null);
    setTimerSec(0); setTimerTotal(0);
    showNotif('✓ Session marked complete!');
  }

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const m = Math.floor(timerSec / 60).toString().padStart(2,'0');
  const s = (timerSec % 60).toString().padStart(2,'0');
  const pct = timerTotal > 0 ? ((timerTotal - timerSec) / timerTotal) * 100 : 0;
  const doneCount = Object.values(progress.sessions || {}).filter(Boolean).length;
  const total = modules.length;
  const activeModule = activeIdx !== null ? modules[activeIdx] : null;
  const accentColor = activeModule?.color || 'var(--accent)';

  return (
    <div style={{ padding:'20px 16px', maxWidth:520, margin:'0 auto' }}>
      <Notif notif={notif} />

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, flexWrap:'wrap', gap:10, paddingTop:8 }}>
        <div>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:3, marginBottom:4 }}>
            Limkokwing · SL
          </div>
          <h1 style={{ fontFamily:'var(--sans)', fontWeight:800, fontSize:28, lineHeight:1 }}>
            Study<span style={{ color:'var(--accent)' }}>Hub</span>
          </h1>
        </div>
        <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', textAlign:'right', lineHeight:1.8 }}>
          <strong style={{ color:'var(--accent)', display:'block', fontSize:15 }}>
            {now.toLocaleTimeString()}
          </strong>
          <span>{now.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</span>
          <span style={{ display:'block' }}>{now.toLocaleDateString('en-GB', { weekday:'long' })}</span>
        </div>
      </div>

      {loading ? (
        <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)' }}>Loading your data...</p>
      ) : (
        <>
          {/* Timer card */}
          <div className="card" style={{ marginBottom:14 }}>
            <div className="card-label">⏱ Focus Timer</div>
            <div style={{ textAlign:'center', fontSize:14, fontWeight:600, marginBottom:2 }}>
              {activeModule ? activeModule.name : 'Select a session below'}
            </div>
            <div style={{ textAlign:'center', fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', marginBottom:10 }}>
              {activeModule ? `${activeModule.duration} min session` : 'Tap a block to load it'}
            </div>

            {/* Big timer */}
            <div style={{
              fontFamily:'var(--mono)', fontSize:'clamp(52px,15vw,88px)', fontWeight:700,
              color: accentColor, textAlign:'center', letterSpacing:4, lineHeight:1,
              margin:'8px 0',
              textShadow: running ? `0 0 40px ${accentColor}88` : 'none',
              transition:'color 0.3s, text-shadow 0.3s',
              animation: running ? 'glow 2s infinite' : 'none',
            }}>
              {m}:{s}
            </div>

            {/* Progress bar */}
            <div className="bar-track" style={{ marginBottom:14 }}>
              <div className="bar-fill" style={{ width: pct+'%', background:`linear-gradient(90deg, ${accentColor}, var(--accent2))` }} />
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
              <button className="btn btn-primary" onClick={toggleTimer} style={{ minWidth:90, justifyContent:'center' }}>
                {running ? 'PAUSE' : activeModule ? 'START' : 'START'}
              </button>
              <button className="btn btn-ghost" onClick={resetTimer}>RESET</button>
              <button className="btn btn-danger" onClick={markDone}>DONE ✓</button>
            </div>
          </div>

          {/* Session blocks */}
          <div className="card green" style={{ marginBottom:14 }}>
            <div className="card-label">📚 Today's Study Blocks</div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {modules.map((mod, i) => {
                const key = mod.id || mod.name;
                const isDone = progress.sessions?.[key];
                const isActive = activeIdx === i;
                return (
                  <button key={i} onClick={() => selectModule(i)}
                    style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'10px 12px', borderRadius:8,
                      border:`1px solid ${isActive ? mod.color : isDone ? 'rgba(0,230,118,0.2)' : 'var(--border)'}`,
                      background: isActive ? `${mod.color}14` : isDone ? 'rgba(0,230,118,0.04)' : 'transparent',
                      opacity: isDone && !isActive ? 0.5 : 1,
                      width:'100%', textAlign:'left',
                      cursor: running ? 'not-allowed' : 'pointer',
                      transition:'all 0.15s',
                    }}>
                    <span style={{ fontSize:18 }}>{mod.icon || '📖'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{mod.name}</div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)' }}>{mod.duration} min</div>
                    </div>
                    {isDone && <span style={{ color:'var(--green)', fontSize:14 }}>✓</span>}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop:12 }}>
              <div className="bar-row"><span>Daily Progress</span><span>{doneCount} / {total} done</span></div>
              <div className="bar-track"><div className="bar-fill" style={{ width: total > 0 ? (doneCount/total*100)+'%' : '0%' }} /></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
