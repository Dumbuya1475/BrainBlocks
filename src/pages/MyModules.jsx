import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { addModule, updateModule, deleteModule, getProgress, subscribeModules } from '../firebase/db';
import { DEFAULT_MODULES } from '../data/curriculum';
import { Notif, useNotif } from '../components/Notif';
import { generateModuleRoadmap } from '../services/geminiRoadmap';
import { getRoadmapStats } from '../utils/roadmapProgress';

const COLORS = ['#00e5ff', '#7c4dff', '#ff6d3a', '#ffd740', '#00e676', '#e040fb', '#ff5252', '#69f0ae'];
const ICONS = ['💻', '🗄️', '📐', '🌐', '📝', '📚', '🧮', '🔬', '🎨', '🧪', '⚙️', '📡', '🔐', '📊', '🧠'];
const MAX_WEEKS = 12;

function formatDailyStudyTime(value) {
  return `${Number(value)} min/day`;
}

function normalizeRoadmap(roadmap) {
  if (!roadmap?.weeks?.length) return null;

  return {
    ...roadmap,
    weeks: roadmap.weeks.map((week, index) => ({
      week: typeof week?.week === 'number' ? week.week : index,
      title: week?.title || `Week ${index}`,
      summary: week?.summary || `Focus on a manageable ${index === 0 ? 'setup' : 'study'} target this week.`,
      note: week?.note || week?.notes || 'Work through each task in small steps and review difficult points before moving on.',
      checkpoint: week?.checkpoint || 'Complete the tasks for this week and confirm you can explain the main ideas clearly.',
      tasks: Array.isArray(week?.tasks) ? week.tasks : [],
    })),
  };
}

function RoadmapWeekCard({ week, accentColor, defaultOpen = false }) {
  return (
    <details
      open={defaultOpen}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: 'var(--surface2)',
        padding: '10px 12px',
      }}
    >
      <summary style={{ listStyle: 'none', cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{week.title || `Week ${week.week}`}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginTop: 4, lineHeight: 1.6 }}>
              {week.summary}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accentColor || 'var(--accent)' }}>W{week.week}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>Tap to expand</span>
          </div>
        </div>
      </summary>

      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent2)', marginBottom: 6 }}>Tasks</div>
          <ul style={{ margin: '0 0 0 18px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {week.tasks.map((task, idx) => <li key={idx} style={{ fontSize: 12, lineHeight: 1.5 }}>{task}</li>)}
          </ul>
        </div>

        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(124,77,255,0.08)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent2)', marginBottom: 4 }}>Instruction / Note</div>
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>{week.note}</div>
        </div>

        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(0,229,255,0.08)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent2)', marginBottom: 4 }}>Checkpoint</div>
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>{week.checkpoint}</div>
        </div>
      </div>
    </details>
  );
}

function RoadmapPreview({ roadmap, accentColor }) {
  const normalizedRoadmap = normalizeRoadmap(roadmap);
  if (!normalizedRoadmap?.weeks?.length) return null;

  return (
    <div className="card" style={{ marginTop: 12, background: 'rgba(124,77,255,0.08)' }}>
      <div className="card-label">AI Roadmap Preview</div>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 10 }}>
        Each week expands to show tasks, a note, and a checkpoint.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {normalizedRoadmap.weeks.map((week, index) => (
          <RoadmapWeekCard key={week.week} week={week} accentColor={accentColor} defaultOpen={index === 0} />
        ))}
      </div>
    </div>
  );
}

export default function MyModules() {
  const { user } = useAuth();
  const { notif, showNotif } = useNotif();
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState({ tasks: {} });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState('');

  const [name, setName] = useState('');
  const [moduleCode, setModuleCode] = useState('');
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState(30);
  const [dailyStudyTime, setDailyStudyTime] = useState(45);
  const [durationWeeks, setDurationWeeks] = useState('12');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState('');
  const [generatedRoadmap, setGeneratedRoadmap] = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      setModules([]);
      setProgress({ tasks: {} });
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = subscribeModules(
      user.uid,
      mods => {
        setModules(mods);
        setLoading(false);
      },
      e => {
        setLoading(false);
        if (e?.code === 'permission-denied') showNotif('Firestore permission denied for modules.', 'error');
        else showNotif('Failed to sync modules.', 'error');
      }
    );

    getProgress(user.uid)
      .then(prog => setProgress(prog || { tasks: {} }))
      .catch(e => {
        if (e?.code === 'permission-denied') showNotif('Firestore permission denied for progress.', 'error');
        else showNotif('Failed to load progress.', 'error');
      });

    return () => unsubscribe();
  }, [user?.uid, showNotif]);

  function resetForm() {
    setEditingId('');
    setName('');
    setModuleCode('');
    setGoal('');
    setDuration(30);
    setDailyStudyTime(45);
    setDurationWeeks('12');
    setColor(COLORS[0]);
    setIcon(ICONS[0]);
    setGeneratedRoadmap(null);
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  function startEdit(mod) {
    setEditingId(mod.id);
    setName(mod.name || '');
    setModuleCode(mod.moduleCode || '');
    setGoal(mod.goal || '');
    setDuration(Number(mod.duration || 30));
    setDailyStudyTime(Number(mod.dailyStudyTime || mod.duration || 45));
    setDurationWeeks(String(Math.min(MAX_WEEKS, Math.max(1, Number(mod.durationWeeks || 12)))));
    setColor(mod.color || COLORS[0]);
    setIcon(mod.icon || ICONS[0]);
    setGeneratedRoadmap(normalizeRoadmap(mod.roadmap));
    setExpandedId(mod.id);
    setShowForm(true);
  }

  async function handleGenerateRoadmap() {
    if (!name.trim()) return showNotif('Enter a module name first.', 'error');
    if (!goal.trim()) return showNotif('Enter a learning goal first.', 'error');

    const safeDurationWeeks = Math.min(MAX_WEEKS, Math.max(1, Number(durationWeeks) || 1));
    if (safeDurationWeeks !== Number(durationWeeks)) {
      setDurationWeeks(String(safeDurationWeeks));
    }

    setSaving(true);
    setGeneratingId(editingId || 'new');
    try {
      const roadmap = await generateModuleRoadmap({
        moduleName: name.trim(),
        moduleCode: moduleCode.trim(),
        goal: goal.trim(),
        dailyStudyTime: formatDailyStudyTime(dailyStudyTime),
        durationWeeks: safeDurationWeeks,
      });
      setGeneratedRoadmap(normalizeRoadmap(roadmap));
      showNotif(roadmap?.generatedBy === 'fallback' ? 'AI was unavailable, so a supportive fallback roadmap was generated.' : 'AI roadmap generated with weekly notes and checkpoints.');
    } catch (e) {
      showNotif(e?.message || 'Failed to generate roadmap.', 'error');
    } finally {
      setSaving(false);
      setGeneratingId('');
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim() || !user?.uid) return;

    const safeDurationWeeks = Math.min(MAX_WEEKS, Math.max(1, Number(durationWeeks) || 1));
    const payload = {
      name: name.trim(),
      moduleCode: moduleCode.trim(),
      goal: goal.trim(),
      duration: Number(duration),
      dailyStudyTime: Number(dailyStudyTime),
      durationWeeks: safeDurationWeeks,
      color,
      icon,
      roadmap: normalizeRoadmap(generatedRoadmap),
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateModule(user.uid, editingId, payload);
        showNotif('Module updated. Changes will sync across your devices.', 'info');
      } else {
        await addModule(user.uid, payload);
        showNotif('Module added and synced to your account.');
      }
      resetForm();
      setShowForm(false);
    } catch (e) {
      if (e?.code === 'permission-denied') showNotif('Permission denied while saving the module.', 'error');
      else showNotif('Failed to save module.', 'error');
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
      if (editingId === id) {
        resetForm();
        setShowForm(false);
      }
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
          moduleCode: '',
          dailyStudyTime: m.duration,
          durationWeeks: 12,
          roadmap: null,
        });
      }
      showNotif('Default modules added. They will sync to your other devices.', 'info');
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
      const roadmap = normalizeRoadmap(await generateModuleRoadmap({
        moduleName: mod.name,
        moduleCode: mod.moduleCode || '',
        goal: nextGoal,
        dailyStudyTime: formatDailyStudyTime(mod.dailyStudyTime || mod.duration || 30),
        durationWeeks: Math.min(MAX_WEEKS, Math.max(1, Number(mod.durationWeeks || 12))),
      }));
      const nextGenCount = (mod.roadmapGenCount || 0) + 1;

      await updateModule(user.uid, mod.id, { roadmap, goal: nextGoal, roadmapGenCount: nextGenCount });
      setModules(current => current.map(item => (
        item.id === mod.id ? { ...item, roadmap, goal: nextGoal, roadmapGenCount: nextGenCount } : item
      )));
      if (editingId === mod.id) {
        setGeneratedRoadmap(roadmap);
        setGoal(nextGoal);
      }
      setExpandedId(mod.id);
      showNotif(roadmap?.generatedBy === 'fallback' ? 'Fallback roadmap saved with weekly guidance.' : 'AI roadmap refreshed and synced.');
    } catch (e) {
      showNotif(e?.message || 'Failed to generate roadmap.', 'error');
    } finally {
      setGeneratingId('');
    }
  }

  return (
    <div style={{ padding: '20px 16px', maxWidth: 520, margin: '0 auto' }}>
      <Notif notif={notif} />

      <div style={{ paddingTop: 8, marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 4 }}>Personalise</div>
        <h1 style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 28 }}>My <span style={{ color: 'var(--accent)' }}>Modules</span></h1>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.7 }}>
          Add your own module, edit it any time, and generate a more supportive week-by-week AI roadmap.
        </p>
      </div>

      {loading ? (
        <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>Loading...</p>
      ) : (
        <>
          {modules.length === 0 && (
            <div className="card" style={{ textAlign: 'center', marginBottom: 14 }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                No modules yet. Add your own or load the defaults.
              </p>
              <button className="btn btn-ghost" onClick={seedDefaults} disabled={saving}>
                Load Default Modules
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {modules.map(mod => (
              <div key={mod.id} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div className="module-row">
                  <span style={{ fontSize: 22 }}>{mod.icon || '📖'}</span>
                  <div
                    style={{
                      width: 4,
                      height: 36,
                      borderRadius: 2,
                      background: mod.color || 'var(--accent)',
                      flexShrink: 0,
                    }}
                  />
                  <div className="module-main">
                    <div style={{ fontSize: 14, fontWeight: 600, wordBreak: 'break-word' }}>{mod.name}</div>
                    <div className="module-meta">
                      {mod.moduleCode ? `${mod.moduleCode} · ` : ''}
                      {mod.duration} min focus block
                      {mod.dailyStudyTime ? ` · ${mod.dailyStudyTime} min/day` : ''}
                      {mod.durationWeeks ? ` · ${mod.durationWeeks} weeks` : ''}
                    </div>
                    {mod.goal && (
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent2)', marginTop: 4, wordBreak: 'break-word' }}>
                        Goal: {mod.goal}
                      </div>
                    )}
                    {mod.roadmap?.weeks?.length > 0 && (() => {
                      const modStats = getRoadmapStats([mod], progress.tasks || {});
                      return (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>
                            <span>Progress</span><span>{modStats.pct}%</span>
                          </div>
                          <div className="bar-track" style={{ height: 4 }}>
                            <div className="bar-fill" style={{ width: `${modStats.pct}%`, background: mod.color || 'var(--accent2)' }} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="module-actions">
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => setExpandedId(expandedId === mod.id ? null : mod.id)}>
                      {expandedId === mod.id ? 'Hide' : 'Plan'}
                    </button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => startEdit(mod)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => regenerateRoadmap(mod)} disabled={generatingId === mod.id}>
                      {generatingId === mod.id ? 'AI...' : (mod.roadmap?.weeks?.length ? 'Refresh AI' : 'Add AI')}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(mod.id)}>✕</button>
                  </div>
                </div>

                {expandedId === mod.id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    {mod.roadmap?.weeks?.length ? (
                      <>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 10 }}>
                          Open a week to see the study instructions, notes, and checkpoint.
                        </p>
                        <RoadmapPreview roadmap={mod.roadmap} accentColor={mod.color || 'var(--accent)'} />
                      </>
                    ) : (
                      <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                        No AI roadmap yet. Use Add AI to generate a study plan for this module.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {showForm ? (
            <div className="card purple fade-in">
              <div className="card-label">{editingId ? 'Edit Module' : 'New Module'}</div>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 12 }}>
                {editingId
                  ? 'Update the module details here. If the goal changes a lot, regenerate the AI roadmap before saving.'
                  : 'Create a module first, then generate an AI roadmap that includes weekly notes and checkpoints.'}
              </p>
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input className="input" placeholder="Module name (e.g. Machine Learning)" value={name} onChange={e => setName(e.target.value)} required />
                <input className="input" placeholder="Module code (optional, e.g. CSC101)" value={moduleCode} onChange={e => setModuleCode(e.target.value.toUpperCase())} maxLength={20} />
                <textarea
                  className="input"
                  placeholder="Learning goal (e.g. I want a clear, practical plan that helps me build confidence step by step)"
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  style={{ minHeight: 78 }}
                />

                <div className="module-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Focus block</label>
                    <input className="input" type="number" min={5} max={180} value={duration} onChange={e => setDuration(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Daily time</label>
                    <input className="input" type="number" min={15} max={240} value={dailyStudyTime} onChange={e => setDailyStudyTime(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Weeks</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={MAX_WEEKS}
                      value={durationWeeks}
                      onChange={e => setDurationWeeks(e.target.value)}
                      onBlur={e => {
                        const v = Math.min(MAX_WEEKS, Math.max(1, Number(e.target.value) || 1));
                        setDurationWeeks(String(v));
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Color</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          background: c,
                          border: 'none',
                          outline: color === c ? '2px solid white' : 'none',
                          outlineOffset: 2,
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Icon</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {ICONS.map(ic => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setIcon(ic)}
                        style={{
                          fontSize: 20,
                          width: 34,
                          height: 34,
                          borderRadius: 6,
                          border: `1px solid ${icon === ic ? 'var(--accent2)' : 'var(--border)'}`,
                          background: icon === ic ? 'rgba(124,77,255,0.2)' : 'var(--surface2)',
                          cursor: 'pointer',
                        }}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost" type="button" onClick={handleGenerateRoadmap} disabled={saving || generatingId === (editingId || 'new')}>
                    {generatingId === (editingId || 'new') ? 'Generating...' : (generatedRoadmap ? 'Refresh AI Roadmap' : 'Generate AI Roadmap')}
                  </button>
                  <button className="btn btn-purple" type="submit" disabled={saving}>
                    {saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Add Module')}
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={() => { setShowForm(false); resetForm(); }}>
                    Cancel
                  </button>
                </div>
              </form>

              <RoadmapPreview roadmap={generatedRoadmap} accentColor={color} />
            </div>
          ) : (
            <button className="btn btn-purple" onClick={openCreateForm} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
              Add New Module
            </button>
          )}
        </>
      )}
    </div>
  );
}
