import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getProfile, saveProfile, getModules, getProgress, getLogs, getPublicProfile, updatePublicProfile } from '../firebase/db';
import { Notif, useNotif } from '../components/Notif';
import { APP_CONFIG, ACCESS_MODE_LABELS } from '../config/appConfig';
import { getRoadmapStats } from '../utils/roadmapProgress';

export default function Profile() {
  const { user, logout } = useAuth();
  const { notif, showNotif } = useNotif();
  const [profile,  setProfile]  = useState(null);
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState({ tasks:{} });
  const [logs,     setLogs]     = useState([]);
  const [shareOn,  setShareOn]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [university, setUniversity] = useState('');
  const [program, setProgram] = useState('');
  const [classGroup, setClassGroup] = useState('');

  const shareUrl = user?.uid ? `${window.location.origin}/u/${user.uid}` : '';

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [mods, p, l, profileDoc, publicDoc] = await Promise.all([
        getModules(user.uid),
        getProgress(user.uid),
        getLogs(user.uid),
        getProfile(user.uid),
        getPublicProfile(user.uid),
      ]);
      setModules(mods);
      setProgress(p);
      setLogs(l);
      setProfile(profileDoc || null);
      setUniversity(profileDoc?.university || '');
      setProgram(profileDoc?.program || '');
      setClassGroup(profileDoc?.classGroup || '');
      setShareOn(Boolean(publicDoc?.shareEnabled));
    } catch (e) {
      if (e?.code === 'permission-denied') showNotif('Firestore permission denied for profile stats.', 'error');
      else showNotif('Failed to load profile stats.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function toggleShare() {
    if (!user?.uid) return;
    const next = !shareOn;
    setShareOn(next);
    const trimmedUniversity = university.trim();
    const trimmedProgram = program.trim();
    const trimmedClassGroup = classGroup.trim();
    const stats = getRoadmapStats(modules, progress.tasks || {});
    try {
      if (next) {
        await updatePublicProfile(user.uid, {
          displayName: user.displayName || 'BrainBlocks User',
          photoURL: user.photoURL || '',
          university: trimmedUniversity,
          program: trimmedProgram,
          classGroup: trimmedClassGroup,
          weeksActive: stats.weeksActive,
          tasksComplete: stats.doneTasks,
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
    } catch (e) {
      setShareOn(!next);
      if (e?.code === 'permission-denied') showNotif('Permission denied while updating public profile.', 'error');
      else showNotif('Failed to update sharing settings.', 'error');
    }
  }

  async function saveAcademicDetails(e) {
    e.preventDefault();
    if (!user?.uid) return;

    const nextProfile = {
      university: university.trim(),
      program: program.trim(),
      classGroup: classGroup.trim(),
      onboardingSeen: true,
      profileCompletedAt: profile?.profileCompletedAt || new Date().toISOString(),
    };

    setSaving(true);
    try {
      await saveProfile(user.uid, nextProfile);
      setProfile(prev => ({ ...(prev || {}), ...nextProfile }));

      if (shareOn) {
        await updatePublicProfile(user.uid, {
          university: nextProfile.university,
          program: nextProfile.program,
          classGroup: nextProfile.classGroup,
        });
      }

      showNotif('✓ Profile details saved!');
    } catch (e) {
      if (e?.code === 'permission-denied') showNotif('Permission denied while saving profile details.', 'error');
      else showNotif('Failed to save profile details.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl)
      .then(() => showNotif('✓ Link copied!'))
      .catch(() => showNotif('Failed to copy link.', 'error'));
  }

  const stats = getRoadmapStats(modules, progress.tasks || {});
  const doneTasks = stats.doneTasks;
  const pct = stats.pct;
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
          {(university || program || classGroup) && (
            <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent2)', marginTop:6, lineHeight:1.7 }}>
              {university || 'University not set'}
              {program ? ` · ${program}` : ''}
              {classGroup ? ` · ${classGroup}` : ''}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom:14 }}>
        <div className="card-label">🎓 Academic Profile</div>
        <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', lineHeight:1.7, marginBottom:14 }}>
          Access mode: {ACCESS_MODE_LABELS[APP_CONFIG.accessMode]}
        </p>
        <form onSubmit={saveAcademicDetails} style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <input
            className="input"
            placeholder="University (optional)"
            value={university}
            onChange={e => setUniversity(e.target.value)}
          />
          <input
            className="input"
            placeholder="Program (optional)"
            value={program}
            onChange={e => setProgram(e.target.value)}
          />
          <input
            className="input"
            placeholder="Class / Group (optional)"
            value={classGroup}
            onChange={e => setClassGroup(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ alignSelf:'flex-start' }}>
            {saving ? 'Saving...' : 'Save Profile Details'}
          </button>
        </form>
      </div>

      {/* Stats */}
      {!loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:14 }}>
          <div className="stat-box"><div className="stat-val">{pct}%</div><div className="stat-label">Roadmap Done</div></div>
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
