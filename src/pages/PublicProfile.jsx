import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicProfile } from '../firebase/db';
import html2canvas from 'html2canvas';

function upsertMeta({ name, property, content }) {
  const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement('meta');
    if (name) node.setAttribute('name', name);
    if (property) node.setAttribute('property', property);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
}

export default function PublicProfile() {
  const { uid } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  const shareTitle = `${profile?.displayName || 'Student'} on BrainBlocks`;
  const shareDescription = `Track progress: ${profile?.tasksComplete || 0} tasks completed, ${profile?.studySessions || 0} study sessions, ${profile?.weeksActive || 0} weeks active.`;
  const shareUrl = window.location.href;
  const shareImage = profile?.photoURL
    ? (profile.photoURL.startsWith('http') ? profile.photoURL : `${window.location.origin}${profile.photoURL}`)
    : `${window.location.origin}/icon.svg`;

  async function downloadCard() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      // Wait for all images to load
      const images = cardRef.current.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(img => 
          new Promise(resolve => {
            if (img.complete) resolve();
            else { img.onload = resolve; img.onerror = resolve; }
          })
        )
      );
      // Small delay to ensure rendering
      await new Promise(r => setTimeout(r, 200));
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#ffffff',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `${profile?.displayName || 'profile'}-brainblocks.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Download failed', e);
    } finally {
      setDownloading(false);
    }
  }

  function printCard() {
    window.print();
  }

  useEffect(() => {
    getPublicProfile(uid)
      .then(p => { setProfile(p); setLoadError(''); })
      .catch(() => setLoadError('Unable to load public profile right now.'))
      .finally(() => setLoading(false));
  }, [uid]);

  useEffect(() => {
    const appTitle = 'BrainBlocks';
    const appDescription = 'BrainBlocks is a student-first study planner with AI roadmaps, focus timers, logs and progress tracking.';

    if (profile?.shareEnabled) {
      document.title = shareTitle;
      upsertMeta({ name: 'description', content: shareDescription });
      upsertMeta({ property: 'og:type', content: 'profile' });
      upsertMeta({ property: 'og:title', content: shareTitle });
      upsertMeta({ property: 'og:description', content: shareDescription });
      upsertMeta({ property: 'og:url', content: shareUrl });
      upsertMeta({ property: 'og:image', content: shareImage });
      upsertMeta({ property: 'og:image:secure_url', content: shareImage });
      upsertMeta({ property: 'og:image:alt', content: `${profile.displayName || 'Student'} profile` });
      upsertMeta({ name: 'twitter:card', content: 'summary_large_image' });
      upsertMeta({ name: 'twitter:title', content: shareTitle });
      upsertMeta({ name: 'twitter:description', content: shareDescription });
      upsertMeta({ name: 'twitter:image', content: shareImage });
      upsertMeta({ name: 'twitter:url', content: shareUrl });
      return;
    }

    document.title = appTitle;
    upsertMeta({ name: 'description', content: appDescription });
    upsertMeta({ property: 'og:type', content: 'website' });
    upsertMeta({ property: 'og:title', content: appTitle });
    upsertMeta({ property: 'og:description', content: appDescription });
    upsertMeta({ property: 'og:url', content: window.location.origin });
    upsertMeta({ property: 'og:image', content: `${window.location.origin}/icon.svg` });
    upsertMeta({ name: 'twitter:card', content: 'summary' });
    upsertMeta({ name: 'twitter:title', content: appTitle });
    upsertMeta({ name: 'twitter:description', content: appDescription });
    upsertMeta({ name: 'twitter:image', content: `${window.location.origin}/icon.svg` });
  }, [profile, shareDescription, shareImage, shareTitle, shareUrl]);

  if (loading) return (
    <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'var(--mono)', color:'var(--accent)', fontSize:13 }}>
      Loading profile...
      <div style={{ position:'absolute', bottom:16, left:0, right:0, textAlign:'center', fontSize:10, letterSpacing:1.2, color:'var(--muted)', textTransform:'uppercase' }}>
        Powered by Tech Inspire SL
      </div>
    </div>
  );

  if (loadError) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', textAlign:'center', padding:20 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
      <h2 style={{ fontFamily:'var(--sans)', fontWeight:800, fontSize:22, marginBottom:8 }}>Could Not Load Profile</h2>
      <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)', marginBottom:20 }}>{loadError}</p>
      <Link to="/" className="btn btn-primary">Go to BrainBlocks</Link>
    </div>
  );

  if (!profile || !profile.shareEnabled) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', textAlign:'center', padding:20 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <h2 style={{ fontFamily:'var(--sans)', fontWeight:800, fontSize:22, marginBottom:8 }}>Profile is Private</h2>
      <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)', marginBottom:20 }}>This student hasn't enabled public sharing yet.</p>
      <Link to="/" className="btn btn-primary">Go to BrainBlocks</Link>
    </div>
  );

  const studyHours = Math.floor((profile.totalMinutes || 0) / 60);

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div ref={cardRef} style={{ width:'100%', maxWidth:400 }} className="fade-in">

        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', letterSpacing:3, textTransform:'uppercase', marginBottom:8 }}>BrainBlocks</div>
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

        <div className="card" style={{ padding:12, marginBottom:16 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', letterSpacing:1.8, textTransform:'uppercase', marginBottom:8 }}>
            Share Preview Card
          </div>
          <div style={{ border:'1px solid var(--line)', borderRadius:12, overflow:'hidden', background:'var(--surface2)' }}>
            <div style={{ height:120, background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <img
                src={shareImage}
                alt="Share preview"
                style={{ width:'100%', height:'100%', objectFit:'cover' }}
                onError={(e) => { e.currentTarget.src = `${window.location.origin}/icon.svg`; }}
              />
            </div>
            <div style={{ padding:10 }}>
              <div style={{ fontFamily:'var(--sans)', fontWeight:700, fontSize:14, marginBottom:4 }}>{shareTitle}</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', lineHeight:1.5 }}>{shareDescription}</div>
            </div>
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:20 }}>
          <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginBottom:12 }}>Want to track your own CS journey?</p>
          <Link to="/" className="btn btn-primary" style={{ display:'inline-flex' }}>Open BrainBlocks</Link>
        </div>

        <div className="no-print" style={{ display:'flex', gap:8, justifyContent:'center', marginTop:16, flexWrap:'wrap' }}>
          <button
            className="btn btn-ghost"
            onClick={downloadCard}
            disabled={downloading}
            style={{ fontSize:11 }}
          >
            {downloading ? 'Saving...' : '🖼️ Save as Image'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={printCard}
            style={{ fontSize:11 }}
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
