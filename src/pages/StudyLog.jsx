import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getLogs, addLog, deleteLog } from '../firebase/db';
import { Notif, useNotif } from '../components/Notif';

const MOODS = ['😤','😐','🙂','😊','🔥'];

export default function StudyLog() {
  const { user } = useAuth();
  const { notif, showNotif } = useNotif();
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const [subject,  setSubject]  = useState('');
  const [duration, setDuration] = useState(60);
  const [notes,    setNotes]    = useState('');
  const [mood,     setMood]     = useState(2);

  useEffect(() => { loadLogs(); }, [user]);

  async function loadLogs() {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const l = await getLogs(user.uid);
      setLogs(l);
    } catch (e) {
      if (e?.code === 'permission-denied') showNotif('Firestore permission denied for study logs.', 'error');
      else showNotif('Failed to load study logs.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    try {
      await addLog(user.uid, {
        subject: subject.trim(),
        duration: Number(duration),
        notes: notes.trim(),
        mood,
        dateStr: new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric', weekday:'short' }),
      });
      setSubject(''); setDuration(60); setNotes(''); setMood(2);
      setShowForm(false);
      await loadLogs();
      showNotif('✓ Log entry saved!');
    } catch (e) {
      if (e?.code === 'permission-denied') showNotif('Permission denied while saving log.', 'error');
      else showNotif('Failed to save log entry.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!user?.uid) return;
    try {
      await deleteLog(user.uid, id);
      setLogs(l => l.filter(x => x.id !== id));
      showNotif('Entry removed', 'info');
    } catch (e) {
      if (e?.code === 'permission-denied') showNotif('Permission denied while deleting log.', 'error');
      else showNotif('Failed to delete log entry.', 'error');
    }
  }

  const totalMins = logs.reduce((a, l) => a + (l.duration || 0), 0);
  const totalHrs  = (totalMins / 60).toFixed(1);

  return (
    <div style={{ padding:'20px 16px', maxWidth:520, margin:'0 auto' }}>
      <Notif notif={notif} />

      <div style={{ paddingTop:8, marginBottom:20 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:3, marginBottom:4 }}>Daily Record</div>
        <h1 style={{ fontFamily:'var(--sans)', fontWeight:800, fontSize:28 }}>Study <span style={{ color:'var(--accent)' }}>Log</span></h1>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
        <div className="stat-box"><div className="stat-val">{logs.length}</div><div className="stat-label">Sessions</div></div>
        <div className="stat-box"><div className="stat-val">{totalHrs}h</div><div className="stat-label">Total Time</div></div>
        <div className="stat-box">
          <div className="stat-val">{logs.length > 0 ? MOODS[Math.round(logs.slice(0,5).reduce((a,l)=>a+(l.mood||2),0)/Math.min(logs.length,5))] : '—'}</div>
          <div className="stat-label">Avg Mood</div>
        </div>
      </div>

      {/* Add form */}
      {showForm ? (
        <div className="card orange fade-in" style={{ marginBottom:14 }}>
          <div className="card-label">📓 New Entry</div>
          <form onSubmit={handleAdd} style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <input className="input" placeholder="What did you study? (e.g. SQL JOINs)" value={subject}
              onChange={e => setSubject(e.target.value)} required />

            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <label style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', flexShrink:0 }}>Duration (min)</label>
              <input className="input" type="number" min={5} max={480} value={duration}
                onChange={e => setDuration(e.target.value)} style={{ width:80 }} />
            </div>

            <textarea className="input" placeholder="Notes — what did you learn? Any difficulties? Next steps..." value={notes}
              onChange={e => setNotes(e.target.value)} style={{ minHeight:80 }} />

            <div>
              <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginBottom:6 }}>How was the session?</div>
              <div style={{ display:'flex', gap:8 }}>
                {MOODS.map((m, i) => (
                  <button key={i} type="button" onClick={() => setMood(i)}
                    style={{
                      fontSize:22, width:40, height:40, borderRadius:8,
                      border:`1px solid ${mood === i ? 'var(--accent3)' : 'var(--border)'}`,
                      background: mood === i ? 'rgba(255,109,58,0.15)' : 'var(--surface2)',
                      cursor:'pointer',
                    }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Entry'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        <button data-tour="log-add" className="btn btn-primary" onClick={() => setShowForm(true)}
          style={{ width:'100%', justifyContent:'center', padding:12, marginBottom:14 }}>
          ➕ Log Today's Study
        </button>
      )}

      {/* Log entries */}
      {loading ? (
        <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)' }}>Loading...</p>
      ) : logs.length === 0 ? (
        <div className="card" style={{ textAlign:'center' }}>
          <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)' }}>No log entries yet. Start tracking today! 📓</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {logs.map(entry => (
            <div key={entry.id} className="card fade-in" style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700 }}>{entry.subject}</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', marginTop:2 }}>
                    {entry.dateStr} · {entry.duration} min · {MOODS[entry.mood || 2]}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(entry.id)} style={{ fontSize:11, padding:'4px 8px' }}>✕</button>
              </div>
              {entry.notes && (
                <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.6, borderTop:'1px solid var(--border)', paddingTop:8, marginTop:4 }}>
                  {entry.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
