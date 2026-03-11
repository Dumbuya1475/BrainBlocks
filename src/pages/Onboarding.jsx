import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getProfile, saveProfile } from '../firebase/db';
import { Notif, useNotif } from '../components/Notif';
import { APP_CONFIG, ACCESS_MODE_LABELS } from '../config/appConfig';

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notif, showNotif } = useNotif();
  const [university, setUniversity] = useState('');
  const [program, setProgram] = useState('');
  const [classGroup, setClassGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const profile = await getProfile(user.uid);
        if (!active || !profile) return;
        setUniversity(profile.university || '');
        setProgram(profile.program || '');
        setClassGroup(profile.classGroup || '');
      } catch (e) {
        if (active) showNotif('Could not load profile setup.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => { active = false; };
  }, [user]);

  async function handleSave(e) {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    try {
      await saveProfile(user.uid, {
        university: university.trim(),
        program: program.trim(),
        classGroup: classGroup.trim(),
        onboardingSeen: true,
        profileCompletedAt: new Date().toISOString(),
      });
      navigate('/', { replace: true });
    } catch (e) {
      if (e?.code === 'permission-denied') showNotif('Permission denied while saving your profile.', 'error');
      else showNotif('Failed to save profile details.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await saveProfile(user.uid, {
        onboardingSeen: true,
        onboardingSkippedAt: new Date().toISOString(),
      });
      navigate('/', { replace: true });
    } catch (e) {
      if (e?.code === 'permission-denied') showNotif('Permission denied while skipping setup.', 'error');
      else showNotif('Failed to finish setup.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <Notif notif={notif} />
      <div style={{ width:'100%', maxWidth:460 }} className="fade-in">
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:3, textTransform:'uppercase', marginBottom:8 }}>
            Phase 1 Setup
          </div>
          <h1 style={{ fontFamily:'var(--sans)', fontWeight:800, fontSize:34, lineHeight:1.1 }}>
            Complete Your <span style={{ color:'var(--accent)' }}>Profile</span>
          </h1>
          <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginTop:10, lineHeight:1.7 }}>
            Add your academic details now or skip and update them later.
          </p>
        </div>

        <div className="card purple">
          <div className="card-label">🎓 Academic Details</div>
          <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', lineHeight:1.7, marginBottom:14 }}>
            Access mode: {ACCESS_MODE_LABELS[APP_CONFIG.accessMode]}
          </p>

          {loading ? (
            <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)' }}>Loading setup...</p>
          ) : (
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:10 }}>
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

              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:6 }}>
                <button className="btn btn-purple" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save & Continue'}
                </button>
                <button className="btn btn-ghost" type="button" onClick={handleSkip} disabled={saving}>
                  Skip for Now
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
