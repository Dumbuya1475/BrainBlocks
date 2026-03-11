import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getModules, addModule, updateModule, deleteModule } from '../firebase/db';
import { DEFAULT_MODULES } from '../data/curriculum';
import { Notif, useNotif } from '../components/Notif';
import { generateModuleRoadmap } from '../services/geminiRoadmap';

const COLORS  = ['#00e5ff','#7c4dff','#ff6d3a','#ffd740','#00e676','#e040fb','#ff5252','#69f0ae'];
const ICONS   = ['💻','🗄️','📐','🌐','📝','📚','🧮','🔬','🎨','🧪','⚙️','📡','🔐','📊','🧠'];

function formatDailyStudyTime(value) {
  return `${Number(value)} min/day`;
}

function RoadmapPreview({ roadmap }) {
  if (!roadmap?.weeks?.length) return null;

  return (
    <div className="card" style={{ marginTop:12, background:'rgba(124,77,255,0.08)' }}>
      <div className="card-label">🤖 AI Roadmap Preview</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {roadmap.weeks.map(week => (
          <div key={week.week} style={{ border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', background:'var(--surface)' }}>
            <div style={{ fontWeight:700, fontSize:13 }}>{week.title || `Week ${week.week}`}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent2)', marginTop:4 }}>W{week.week}</div>
            <ul style={{ margin:'8px 0 0 18px', padding:0, display:'flex', flexDirection:'column', gap:6 }}>
              {week.tasks.map((task, idx) => <li key={idx} style={{ fontSize:12, lineHeight:1.5 }}>{task}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MyModules() {
  const { user } = useAuth();
  const { notif, showNotif } = useNotif();
  const [modules, setModules]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const [name,     setName]     = useState('');
  const [goal,     setGoal]     = useState('');
  const [duration, setDuration] = useState(30);
  const [dailyStudyTime, setDailyStudyTime] = useState(45);
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [color,    setColor]    = useState(COLORS[0]);
  const [icon,     setIcon]     = useState(ICONS[0]);
  const [saving,   setSaving]   = useState(false);
  const [generatingId, setGeneratingId] = useState('');
  const [generatedRoadmap, setGeneratedRoadmap] = useState(null);

  useEffect(() => { loadMods(); }, [user]);

  async function loadMods() {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const mods = await getModules(user.uid);
      setModules(mods);
    } catch (e) {
      if (e?.code === 'permission-denied') showNotif('Firestore permission denied for modules.', 'error');
      else showNotif('Failed to load modules.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName('');
    setGoal('');
    setDuration(30);
    setDailyStudyTime(45);
    setDurationWeeks(12);
    setColor(COLORS[0]);
    setIcon(ICONS[0]);
    setGeneratedRoadmap(null);
  }

  async function handleGenerateRoadmap() {
    if (!name.trim()) return showNotif('Enter a module name first.', 'error');
    if (!goal.trim()) return showNotif('Enter a learning goal first.', 'error');

    setSaving(true);
    setGeneratingId('new');
    try {
      const roadmap = await generateModuleRoadmap({
        moduleName: name.trim(),
        goal: goal.trim(),
        dailyStudyTime: formatDailyStudyTime(dailyStudyTime),
        durationWeeks: Number(durationWeeks),
      });
      setGeneratedRoadmap(roadmap);
      showNotif('✓ AI roadmap generated!');
    } catch (e) {
      showNotif(e?.message || 'Failed to generate roadmap.', 'error');
    } finally {
      setSaving(false);
      setGeneratingId('');
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim() || !user?.uid) return;
    setSaving(true);
    try {
      await addModule(user.uid, {
        name: name.trim(),
        goal: goal.trim(),
        duration: Number(duration),
        dailyStudyTime: Number(dailyStudyTime),
        durationWeeks: Number(durationWeeks),
        color,
        icon,
        roadmap: generatedRoadmap,
      });
      resetForm();
      setShowForm(false);
      await loadMods();
      showNotif('✓ Module added!');
    } catch (e) {
      if (e?.code === 'permission-denied') showNotif('Permission denied while adding module.', 'error');
      else showNotif('Failed to add module.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!user?.uid) return;
    try {
      await deleteModule(user.uid, id);
      setModules(m => m.filter(x => x.id !== id));
      if (expandedId === id) setExpandedId(null);
      showNotif('Module removed', 'info');
    } catch (e) {
      if (e?.code === 'permission-denied') showNotif('Permission denied while deleting module.', 'error');
      else showNotif('Failed to delete module.', 'error');
    }
  }

  async function seedDefaults() {
    if (!user?.uid) return;
    setSaving(true);
    try {
      for (const m of DEFAULT_MODULES) {
        await addModule(user.uid, {
          ...m,
          goal: `Build stronger understanding in ${m.name}`,
          dailyStudyTime: m.duration,
          durationWeeks: 12,
          roadmap: null,
        });
      }
      await loadMods();
      showNotif('✓ Default modules added!');
    } catch (e) {
      if (e?.code === 'permission-denied') showNotif('Permission denied while seeding modules.', 'error');
      else showNotif('Failed to add default modules.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function regenerateRoadmap(mod) {
    if (!user?.uid || !mod?.id) return;
    setGeneratingId(mod.id);
    try {
      const nextGoal = mod.goal || `Build working skill in ${mod.name}`;
      const roadmap = await generateModuleRoadmap({
        moduleName: mod.name,
        goal: nextGoal,
        dailyStudyTime: formatDailyStudyTime(mod.dailyStudyTime || mod.duration || 30),
        durationWeeks: Number(mod.durationWeeks || 12),
      });
      await updateModule(user.uid, mod.id, { roadmap, goal: nextGoal });
      setModules(current => current.map(item => item.id === mod.id ? { ...item, roadmap, goal: nextGoal } : item));
      setExpandedId(mod.id);
      showNotif('✓ AI roadmap updated!');
    } catch (e) {
      showNotif(e?.message || 'Failed to generate roadmap.', 'error');
    } finally {
      setGeneratingId('');
    }
  }

  return (
    <div style={{ padding:'20px 16px', maxWidth:520, margin:'0 auto' }}>
      <Notif notif={notif} />

      <div style={{ paddingTop:8, marginBottom:20 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:3, marginBottom:4 }}>Personalise</div>
        <h1 style={{ fontFamily:'var(--sans)', fontWeight:800, fontSize:28 }}>My <span style={{ color:'var(--accent)' }}>Modules</span></h1>
        <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginTop:8, lineHeight:1.7 }}>
          Add your own module, set your focus-block time, and generate a week-by-week AI roadmap.
        </p>
      </div>

      {loading ? (
        <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)' }}>Loading...</p>
      ) : (
        <>
          {modules.length === 0 && (
            <div className="card" style={{ textAlign:'center', marginBottom:14 }}>
              <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)', marginBottom:14 }}>
                No modules yet. Add your own or load the defaults.
              </p>
              <button className="btn btn-ghost" onClick={seedDefaults} disabled={saving}>
                Load Default Modules
              </button>
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
            {modules.map(mod => (
              <div key={mod.id} style={{
                padding:'12px 14px', borderRadius:10,
                border:'1px solid var(--border)', background:'var(--surface)',
              }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <span style={{ fontSize:22 }}>{mod.icon || '📖'}</span>
                  <div style={{
                    width:4, height:36, borderRadius:2,
                    background: mod.color || 'var(--accent)', flexShrink:0
                  }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{mod.name}</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', lineHeight:1.8 }}>
                      {mod.duration} min focus block
                      {mod.dailyStudyTime ? ` · ${mod.dailyStudyTime} min/day` : ''}
                      {mod.durationWeeks ? ` · ${mod.durationWeeks} weeks` : ''}
                    </div>
                    {mod.goal && (
                      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent2)', marginTop:4 }}>
                        Goal: {mod.goal}
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => setExpandedId(expandedId === mod.id ? null : mod.id)}>
                      {expandedId === mod.id ? 'Hide' : 'Plan'}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => regenerateRoadmap(mod)}
                      disabled={generatingId === mod.id}
                    >
                      {generatingId === mod.id ? 'AI...' : mod.roadmap ? 'Redo AI' : 'Add AI'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(mod.id)}>✕</button>
                  </div>
                </div>

                {expandedId === mod.id && (
                  <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
                    {mod.roadmap?.weeks?.length ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {mod.roadmap.weeks.map(week => (
                          <div key={week.week} style={{ border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', background:'var(--surface2)' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'center', marginBottom:6 }}>
                              <strong style={{ fontSize:13 }}>{week.title || `Week ${week.week}`}</strong>
                              <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent)' }}>W{week.week}</span>
                            </div>
                            <ul style={{ margin:'0 0 0 18px', padding:0, display:'flex', flexDirection:'column', gap:6 }}>
                              {week.tasks.map((task, idx) => <li key={idx} style={{ fontSize:12, lineHeight:1.5 }}>{task}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)' }}>
                        No AI roadmap yet. Use “Add AI” to generate a study plan for this module.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {showForm ? (
            <div className="card purple fade-in">
              <div className="card-label">➕ New Module</div>
              <form onSubmit={handleAdd} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <input className="input" placeholder="Module name (e.g. Machine Learning)" value={name} onChange={e => setName(e.target.value)} required />
                <textarea
                  className="input"
                  placeholder="Learning goal (e.g. Build a solid SQL foundation and complete hands-on practice)"
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  style={{ minHeight:78 }}
                />

                <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:10 }}>
                  <div>
                    <label style={{ display:'block', fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginBottom:6 }}>Focus block</label>
                    <input className="input" type="number" min={5} max={180} value={duration} onChange={e => setDuration(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginBottom:6 }}>Daily time</label>
                    <input className="input" type="number" min={15} max={240} value={dailyStudyTime} onChange={e => setDailyStudyTime(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginBottom:6 }}>Weeks</label>
                    <input className="input" type="number" min={1} max={24} value={durationWeeks} onChange={e => setDurationWeeks(e.target.value)} />
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginBottom:6 }}>Color</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setColor(c)}
                        style={{
                          width:26, height:26, borderRadius:6, background:c, border:'none',
                          outline: color === c ? `2px solid white` : 'none',
                          outlineOffset:2, cursor:'pointer',
                        }} />
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginBottom:6 }}>Icon</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {ICONS.map(ic => (
                      <button key={ic} type="button" onClick={() => setIcon(ic)}
                        style={{
                          fontSize:20, width:34, height:34, borderRadius:6,
                          border:`1px solid ${icon === ic ? 'var(--accent2)' : 'var(--border)'}`,
                          background: icon === ic ? 'rgba(124,77,255,0.2)' : 'var(--surface2)',
                          cursor:'pointer',
                        }}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button className="btn btn-ghost" type="button" onClick={handleGenerateRoadmap} disabled={saving || generatingId === 'new'}>
                    {generatingId === 'new' ? 'Generating...' : '🤖 Generate AI Roadmap'}
                  </button>
                  <button className="btn btn-purple" type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Add Module'}
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
                </div>
              </form>

              <RoadmapPreview roadmap={generatedRoadmap} />
            </div>
          ) : (
            <button className="btn btn-purple" onClick={() => setShowForm(true)} style={{ width:'100%', justifyContent:'center', padding:12 }}>
              ➕ Add New Module
            </button>
          )}
        </>
      )}
    </div>
  );
}
