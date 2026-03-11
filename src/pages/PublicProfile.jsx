import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicProfile } from '../firebase/db';

export default function PublicProfile() {
  const { uid } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    getPublicProfile(uid)
      .then(p => { setProfile(p); setLoadError(''); })
      .catch(() => setLoadError('Unable to load public profile right now.'))
      .finally(() => setLoading(false));
  }, [uid]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'var(--mono)', color:'var(--accent)', fontSize:13 }}>
      Loading profile...
    </div>
  );

  if (loadError) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', textAlign:'center', padding:20 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
      <h2 style={{ fontFamily:'var(--sans)', fontWeight:800, fontSize:22, marginBottom:8 }}>Could Not Load Profile</h2>
      <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)', marginBottom:20 }}>{loadError}</p>
      <Link to="/" className="btn btn-primary">Go to StudyHub</Link>
    </div>
  );

  if (!profile || !profile.shareEnabled) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', textAlign:'center', padding:20 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <h2 style={{ fontFamily:'var(--sans)', fontWeight:800, fontSize:22, marginBottom:8 }}>Profile is Private</h2>
      <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)', marginBottom:20 }}>This student hasn't enabled public sharing yet.</p>
      <Link to="/" className="btn btn-primary">Go to StudyHub</Link>
    </div>
  );

  const studyHours = Math.floor((profile.totalMinutes || 0) / 60);

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:400 }} className="fade-in">

        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', letterSpacing:3, textTransform:'uppercase', marginBottom:8 }}>StudyHub</div>
          {profile.photoURL ? (
            <img src={profile.photoURL} alt="" style={{ width:72, height:72, borderRadius:'50%', border:'3px solid var(--accent)', marginBottom:12 }} />
          ) : (
            <div style={{ width:72, height:72, borderRadius:'50%', background:'var(--surface2)', border:'3px solid var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 12px' }}>👤</div>
          )}
          <h1 style={{ fontFamily:'var(--sans)', fontWeight:800, fontSize:26 }}>{profile.displayName}</h1>
          <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginTop:4 }}>Limkokwing University · Sierra Leone</p>
          {(profile.university || profile.program || profile.classGroup) && (
            <div style={{ marginTop:10, fontFamily:'var(--mono)', fontSize:10, color:'var(--accent2)', lineHeight:1.8 }}>
              {profile.university && <div>{profile.university}</div>}
              {profile.program && <div>{profile.program}</div>}
              {profile.classGroup && <div>{profile.classGroup}</div>}
            </div>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:16 }}>
          {[
            { val:`${profile.weeksActive || 0}`, label:'Weeks Active'     },
            { val:`${profile.tasksComplete || 0}`, label:'Tasks Complete' },
            { val:`${profile.studySessions || 0}`, label:'Study Sessions' },
            { val:`${studyHours}h`,              label:'Total Study Time' },
          ].map(s => (
            <div key={s.label} className="stat-box card">
              <div className="stat-val" style={{ fontSize:28 }}>{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign:'center', marginTop:20 }}>
          <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginBottom:12 }}>Want to track your own CS journey?</p>
          <Link to="/" className="btn btn-primary" style={{ display:'inline-flex' }}>Open StudyHub</Link>
        </div>
      </div>
    </div>
  );
}
