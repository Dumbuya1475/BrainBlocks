import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getProgress, getLogs, updatePublicProfile } from '../firebase/db';
import { WEEKS } from '../data/curriculum';
import { Notif, useNotif } from '../components/Notif';

export default function Profile() {
  const { user, logout } = useAuth();
  const { notif, showNotif } = useNotif();
  const [progress, setProgress] = useState({ tasks:{} });
  const [logs,     setLogs]     = useState([]);
  const [shareOn,  setShareOn]  = useState(false);
  const [loading,  setLoading]  = useState(true);

  const shareUrl = `${window.location.origin}/u/${user.uid}`;

  useEffect(() => { load(); }, [user]);

  async function load() {
    setLoading(true);
    const [p, l] = await Promise.all([getProgress(user.uid), getLogs(user.uid)]);
    setProgress(p);
    setLogs(l);
    setLoading(false);
  }

  async function toggleShare() {
    const next = !shareOn;
    setShareOn(next);
    if (next) {
      let done = 0, total = 0;
      WEEKS.forEach((w,wi) => w.tasks.forEach((_,ti) => { total++; if(p.tasks?.[`${wi}-${ti}`]) done++; }));
      await updatePublicProfile(user.uid, {
        displayName: user.displayName || 'StudyHub User',
        photoURL: user.photoURL || '',
        weeksActive: WEEKS.filter((_,wi) => WEEKS[wi].tasks.some((_,ti) => progress.tasks?.[`${wi}-${ti}`])).length,
        tasksComplete: Object.values(progress.tasks||{}).filter(Boolean).length,
        studySessions: logs.length,
        totalMinutes: logs.reduce((a,l) => a+(l.duration||0), 0),
        shareEnabled: true,
        uid: user.uid,
      });
      showNotif('✓ Public profile enabled!');
    } else {
      await updatePublicProfile(user.uid, { shareEnabled: false });
      showNotif('Profile set to private', 'info');
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => showNotif('✓ Link copied!'));
  }

  let totalTasks = 0, doneTasks = 0;
  WEEKS.forEach((w,wi) => w.tasks.forEach((_,ti) => { totalTasks++; if(progress.tasks?.[`${wi}-${ti}`]) doneTasks++; }));
  const pct = Math.round(doneTasks / totalTasks * 100);
  const totalMins = logs.reduce((a,l) => a+(l.duration||0), 0);

  return (
    <div style={{ padding:'20px 16px', maxWidth:520, margin:'0 auto' }}>
      <Notif notif={notif} />

      <div style={{ paddingTop:8, marginBottom:20 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:3, marginBottom:4 }}>Your Account</div>
        <h1 style={{ fontFamily:'var(--sans)', fontWeight:800, fontSize:28 }}>My <span style={{ color:'var(--accent)' }}>Profile</span></h1>
      </div>

      {/* User card */}
      <div className="card" style={{ marginBottom:14, display:'flex', alignItems:'center', gap:16 }}>
        {user.photoURL ? (
          <img src={user.photoURL} alt="avatar" style={{ width:56, height:56, borderRadius:'50%', border:'2px solid var(--accent)' }} />
        ) : (
          <div style={{ width:56, height:56, borderRadius:'50%', background:'var(--surface2)', border:'2px solid var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
            👤
          </div>
        )}
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>{user.displayName || 'Student'}</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)' }}>{user.email}</div>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:14 }}>
          <div className="stat-box"><div className="stat-val">{pct}%</div><div className="stat-label">Curriculum Done</div></div>
          <div className="stat-box"><div className="stat-val">{logs.length}</div><div className="stat-label">Study Sessions</div></div>
          <div className="stat-box"><div className="stat-val">{Math.floor(totalMins/60)}h</div><div className="stat-label">Total Study Time</div></div>
          <div className="stat-box"><div className="stat-val">{doneTasks}</div><div className="stat-label">Tasks Complete</div></div>
        </div>
      )}

      {/* Share profile */}
      <div className="card purple" style={{ marginBottom:14 }}>
        <div className="card-label">👥 Share Progress</div>
        <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', lineHeight:1.7, marginBottom:14 }}>
          Enable a public profile so classmates can see your progress stats. They can't see your notes or logs — only your overall numbers.
        </p>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className={shareOn ? 'btn btn-ghost' : 'btn btn-purple'} onClick={toggleShare}>
            {shareOn ? '🔒 Make Private' : '🌐 Enable Public Profile'}
          </button>
          {shareOn && (
            <button className="btn btn-ghost" onClick={copyLink}>📋 Copy Link</button>
          )}
        </div>
        {shareOn && (
          <div style={{ marginTop:12, padding:'8px 12px', background:'var(--surface2)', borderRadius:6, fontFamily:'var(--mono)', fontSize:10, color:'var(--accent)', wordBreak:'break-all' }}>
            {shareUrl}
          </div>
        )}
      </div>

      {/* Sign out */}
      <button className="btn btn-danger" onClick={logout} style={{ width:'100%', justifyContent:'center', padding:12 }}>
        Sign Out
      </button>
    </div>
  );
}
