import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getProfile, saveProfile } from '../firebase/db';
import { Notif, useNotif } from '../components/Notif';
import { APP_CONFIG, ACCESS_MODE_LABELS } from '../config/appConfig';

const COURSE_CATEGORY_OPTIONS = [
  'Tech',
  'Business',
  'Accounting',
  'Engineering',
  'Data Science',
  'Cybersecurity',
  'Finance',
  'Entrepreneurship',
  'Health Sciences',
  'Law',
  'Education',
  'Arts & Design',
  'Media & Communication',
  'Agriculture',
  'Project Management',
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notif, showNotif } = useNotif();
  const [university, setUniversity] = useState('');
  const [program, setProgram] = useState('');
  const [classGroup, setClassGroup] = useState('');
  const [gender, setGender] = useState('');
  const [courseCategories, setCourseCategories] = useState([]);
  const [customCategory, setCustomCategory] = useState('');
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
        setGender(profile.gender || '');
        setCourseCategories(Array.isArray(profile.courseCategories) ? profile.courseCategories : []);
      } catch (e) {
        if (active) showNotif('Could not load profile setup.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => { active = false; };
  }, [user]);

  function toggleCategory(category) {
    setCourseCategories(prev => (
      prev.includes(category)
        ? prev.filter(item => item !== category)
        : [...prev, category]
    ));
  }

  function addCustomCategory() {
    const value = customCategory.trim();
    if (!value) return;

    const exists = courseCategories.some(item => item.toLowerCase() === value.toLowerCase());
    if (!exists) {
      setCourseCategories(prev => [...prev, value]);
    }
    setCustomCategory('');
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    try {
      await saveProfile(user.uid, {
        university: university.trim(),
        program: program.trim(),
        classGroup: classGroup.trim(),
        gender,
        courseCategories,
        onboardingSeen: true,
        profileCompletedAt: new Date().toISOString(),
        walkthroughSeen: false,
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
        walkthroughSeen: false,
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
            Welcome to BrainBlocks
          </div>
          <h1 style={{ fontFamily:'var(--sans)', fontWeight:800, fontSize:34, lineHeight:1.1 }}>
            Complete Your <span style={{ color:'var(--accent)' }}>Profile</span>
          </h1>
          <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginTop:10, lineHeight:1.7 }}>
            Add your academic details now or skip and update them later. A quick walkthrough will appear after this step.
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

              <div style={{ marginTop:4 }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:8 }}>
                  Gender
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button
                    type="button"
                    className={gender === 'Male' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                    onClick={() => setGender('Male')}
                  >
                    Male
                  </button>
                  <button
                    type="button"
                    className={gender === 'Female' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                    onClick={() => setGender('Female')}
                  >
                    Female
                  </button>
                </div>
              </div>

              <div style={{ marginTop:4 }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:8 }}>
                  Course Categories
                </div>
                <p style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', marginBottom:8 }}>
                  Pick one or more categories that match your interests.
                </p>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                  {COURSE_CATEGORY_OPTIONS.map(category => (
                    <button
                      key={category}
                      type="button"
                      className={courseCategories.includes(category) ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <input
                    className="input"
                    style={{ flex:'1 1 220px' }}
                    placeholder="Add another category"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomCategory();
                      }
                    }}
                  />
                  <button type="button" className="btn btn-ghost" onClick={addCustomCategory}>
                    Add
                  </button>
                </div>
              </div>

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
