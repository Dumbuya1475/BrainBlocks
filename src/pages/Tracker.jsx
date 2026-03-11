import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getModules, getProgress, saveProgress } from '../firebase/db';
import { Notif, useNotif } from '../components/Notif';
import { getTrackableModules, getTaskProgressKey, getModuleWeekCompletion, getRoadmapStats } from '../utils/roadmapProgress';

export default function Tracker() {
  const { user } = useAuth();
  const { notif, showNotif } = useNotif();
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState({ tasks:{} });
  const [activeModuleId, setActiveModuleId] = useState('');
  const [activeWeek, setActiveWeek] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [mods, p] = await Promise.all([getModules(user.uid), getProgress(user.uid)]);
      const trackable = getTrackableModules(mods);
      setModules(mods);
      setProgress(p);
      setActiveModuleId(current => current || trackable[0]?.id || '');
      setActiveWeek(0);
    } catch (e) {
      if (e?.code === 'permission-denied') showNotif('Firestore permission denied for tracker data.', 'error');
      else showNotif('Failed to load tracker data.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const trackableModules = useMemo(() => getTrackableModules(modules), [modules]);
  const stats = useMemo(() => getRoadmapStats(trackableModules, progress.tasks || {}), [trackableModules, progress.tasks]);
  const activeModule = trackableModules.find(mod => mod.id === activeModuleId) || trackableModules[0] || null;
  const activeRoadmapWeeks = activeModule?.roadmap?.weeks || [];
  const safeActiveWeek = Math.min(activeWeek, Math.max(activeRoadmapWeeks.length - 1, 0));
  const currentWeek = activeRoadmapWeeks[safeActiveWeek] || null;

  useEffect(() => {
    if (!activeModule && activeModuleId) setActiveModuleId('');
    if (activeModule && activeModule.id !== activeModuleId) setActiveModuleId(activeModule.id);
  }, [activeModule, activeModuleId]);

  useEffect(() => {
    setActiveWeek(0);
  }, [activeModuleId]);

  async function toggleTask(moduleId, weekIndex, taskIndex) {
    if (!user?.uid || !moduleId) return;
    const key = getTaskProgressKey(moduleId, weekIndex, taskIndex);
    const previous = progress;
    const updated = {
      ...progress,
      tasks: { ...progress.tasks, [key]: !progress.tasks?.[key] }
    };
    setProgress(updated);
    try {
      await saveProgress(user.uid, updated);
    } catch (e) {
      setProgress(previous);
      if (e?.code === 'permission-denied') showNotif('Permission denied while saving tracker progress.', 'error');
      else showNotif('Failed to save tracker progress.', 'error');
    }
  }

  return (
    <div style={{ padding:'20px 16px', maxWidth:520, margin:'0 auto' }}>
      <Notif notif={notif} />

      <div style={{ paddingTop:8, marginBottom:20 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:3, marginBottom:4 }}>AI Module Tracker</div>
        <h1 style={{ fontFamily:'var(--sans)', fontWeight:800, fontSize:28 }}>Week <span style={{ color:'var(--accent)' }}>Tracker</span></h1>
      </div>

      {loading ? (
        <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)' }}>Loading...</p>
      ) : trackableModules.length === 0 ? (
        <div className="card orange">
          <div className="card-label">🤖 No AI Roadmaps Yet</div>
          <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', lineHeight:1.7 }}>
            Generate an AI roadmap in My Modules first. The tracker will automatically create Week 0 → Week N checklists for each module.
          </p>
        </div>
      ) : (
        <>
          <div className="card orange" style={{ marginBottom:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
              <div className="stat-box"><div className="stat-val">{stats.weeksActive}</div><div className="stat-label">Weeks Active</div></div>
              <div className="stat-box"><div className="stat-val">{stats.doneTasks}</div><div className="stat-label">Tasks Done</div></div>
              <div className="stat-box"><div className="stat-val">{stats.pct}%</div><div className="stat-label">Overall</div></div>
            </div>
            <div className="bar-row"><span>Roadmap Progress</span><span>{stats.pct}%</span></div>
            <div className="bar-track" style={{ height:8 }}>
              <div className="bar-fill" style={{ width: `${stats.pct}%` }} />
            </div>
          </div>

          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
            {trackableModules.map(mod => {
              const moduleStats = getRoadmapStats([mod], progress.tasks || {});
              const active = mod.id === activeModule?.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModuleId(mod.id)}
                  style={{
                    border:`1px solid ${active ? (mod.color || 'var(--accent2)') : 'var(--border)'}`,
                    background: active ? `${mod.color || '#7c4dff'}20` : 'transparent',
                    color: active ? 'var(--text)' : 'var(--muted)',
                    borderRadius:8,
                    padding:'8px 10px',
                    cursor:'pointer',
                    textAlign:'left',
                  }}
                >
                  <div style={{ fontSize:12, fontWeight:700 }}>{mod.icon || '📘'} {mod.name}</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:10, marginTop:4 }}>{moduleStats.pct}% complete</div>
                </button>
              );
            })}
          </div>

          {activeModule && (
            <>
              <div className="card" style={{ marginBottom:14 }}>
                <div className="card-label">📚 Current Module</div>
                <div style={{ fontSize:16, fontWeight:700 }}>{activeModule.name}</div>
                {activeModule.goal && (
                  <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent2)', marginTop:6, lineHeight:1.7 }}>
                    Goal: {activeModule.goal}
                  </div>
                )}
              </div>

              <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:14 }}>
                {activeRoadmapWeeks.map((week, index) => {
                  const complete = getModuleWeekCompletion(activeModule, progress.tasks || {}, index);
                  const active = index === safeActiveWeek;
                  return (
                    <button
                      key={`${activeModule.id}-${index}`}
                      onClick={() => setActiveWeek(index)}
                      style={{
                        fontFamily:'var(--mono)', fontSize:10, padding:'5px 9px',
                        borderRadius:5, textTransform:'uppercase', letterSpacing:'1px',
                        border:`1px solid ${active ? 'var(--accent2)' : complete ? 'var(--green)' : 'var(--border)'}`,
                        background: active ? 'var(--accent2)' : complete ? 'rgba(0,230,118,0.12)' : 'transparent',
                        color: active ? '#fff' : complete ? 'var(--green)' : 'var(--muted)',
                        cursor:'pointer', transition:'all 0.15s',
                      }}
                    >
                      W{week.week}
                    </button>
                  );
                })}
              </div>

              {currentWeek && (
                <div className="card" style={{ marginBottom:14 }}>
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:15, fontWeight:700 }}>{currentWeek.title || `Week ${currentWeek.week}`}</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent2)', marginTop:2 }}>
                      → {activeModule.name}
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {currentWeek.tasks.map((task, taskIndex) => {
                      const checked = progress.tasks?.[getTaskProgressKey(activeModule.id || activeModule.name, safeActiveWeek, taskIndex)];
                      return (
                        <button key={taskIndex} onClick={() => toggleTask(activeModule.id || activeModule.name, safeActiveWeek, taskIndex)}
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
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
