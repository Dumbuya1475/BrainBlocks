import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getProgress, saveProgress } from '../firebase/db';
import { WEEKS } from '../data/curriculum';
import { Notif, useNotif } from '../components/Notif';

export default function Tracker() {
  const { user } = useAuth();
  const { notif, showNotif } = useNotif();
  const [progress,   setProgress]   = useState({ tasks:{} });
  const [activeWeek, setActiveWeek] = useState(0);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => { load(); }, [user]);

  async function load() {
    setLoading(true);
    const p = await getProgress(user.uid);
    setProgress(p);
    setLoading(false);
  }

  async function toggleTask(wi, ti) {
    const key = `${wi}-${ti}`;
    const updated = {
      ...progress,
      tasks: { ...progress.tasks, [key]: !progress.tasks?.[key] }
    };
    setProgress(updated);
    await saveProgress(user.uid, updated);
  }

  const isWeekComplete = wi => WEEKS[wi].tasks.every((_,ti) => progress.tasks?.[`${wi}-${ti}`]);

  let totalTasks = 0, doneTasks = 0;
  WEEKS.forEach((w,wi) => w.tasks.forEach((_,ti) => { totalTasks++; if(progress.tasks?.[`${wi}-${ti}`]) doneTasks++; }));
  const pct = Math.round(doneTasks/totalTasks*100);
  const weeksActive = WEEKS.filter((_,wi) => WEEKS[wi].tasks.some((_,ti) => progress.tasks?.[`${wi}-${ti}`])).length;

  return (
    <div style={{ padding:'20px 16px', maxWidth:520, margin:'0 auto' }}>
      <Notif notif={notif} />

      <div style={{ paddingTop:8, marginBottom:20 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:3, marginBottom:4 }}>12-Week Curriculum</div>
        <h1 style={{ fontFamily:'var(--sans)', fontWeight:800, fontSize:28 }}>Week <span style={{ color:'var(--accent)' }}>Tracker</span></h1>
      </div>

      {loading ? (
        <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)' }}>Loading...</p>
      ) : (
        <>
          {/* Stats */}
          <div className="card orange" style={{ marginBottom:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
              <div className="stat-box"><div className="stat-val">{weeksActive}</div><div className="stat-label">Weeks Active</div></div>
              <div className="stat-box"><div className="stat-val">{doneTasks}</div><div className="stat-label">Tasks Done</div></div>
              <div className="stat-box"><div className="stat-val">{pct}%</div><div className="stat-label">Overall</div></div>
            </div>
            <div className="bar-row"><span>Curriculum Progress</span><span>{pct}%</span></div>
            <div className="bar-track" style={{ height:8 }}>
              <div className="bar-fill" style={{ width: pct+'%' }} />
            </div>
          </div>

          {/* Week selector */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:14 }}>
            {WEEKS.map((w, i) => {
              const complete = isWeekComplete(i);
              const active   = i === activeWeek;
              return (
                <button key={i} onClick={() => setActiveWeek(i)}
                  style={{
                    fontFamily:'var(--mono)', fontSize:10, padding:'5px 9px',
                    borderRadius:5, textTransform:'uppercase', letterSpacing:'1px',
                    border:`1px solid ${active ? 'var(--accent2)' : complete ? 'var(--green)' : 'var(--border)'}`,
                    background: active ? 'var(--accent2)' : complete ? 'rgba(0,230,118,0.12)' : 'transparent',
                    color: active ? '#fff' : complete ? 'var(--green)' : 'var(--muted)',
                    cursor:'pointer', transition:'all 0.15s',
                  }}>
                  {w.label}
                </button>
              );
            })}
          </div>

          {/* Task list */}
          <div className="card" style={{ marginBottom:14 }}>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:15, fontWeight:700 }}>{WEEKS[activeWeek].title}</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent2)', marginTop:2 }}>
                → {WEEKS[activeWeek].focus}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {WEEKS[activeWeek].tasks.map((task, ti) => {
                const checked = progress.tasks?.[`${activeWeek}-${ti}`];
                return (
                  <button key={ti} onClick={() => toggleTask(activeWeek, ti)}
                    style={{
                      display:'flex', alignItems:'flex-start', gap:10,
                      padding:'10px 12px', borderRadius:8,
                      border:`1px solid ${checked ? 'rgba(0,230,118,0.3)' : 'var(--border)'}`,
                      background: checked ? 'rgba(0,230,118,0.05)' : 'var(--surface2)',
                      width:'100%', textAlign:'left', cursor:'pointer', transition:'all 0.15s',
                    }}>
                    <div style={{
                      width:16, height:16, borderRadius:4, flexShrink:0, marginTop:1,
                      border:`1.5px solid ${checked ? 'var(--green)' : 'var(--border)'}`,
                      background: checked ? 'rgba(0,230,118,0.2)' : 'transparent',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:10, color:'var(--green)',
                    }}>
                      {checked ? '✓' : ''}
                    </div>
                    <span style={{
                      fontSize:13, lineHeight:1.5,
                      textDecoration: checked ? 'line-through' : 'none',
                      color: checked ? 'var(--muted)' : 'var(--text)',
                    }}>
                      {task}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
