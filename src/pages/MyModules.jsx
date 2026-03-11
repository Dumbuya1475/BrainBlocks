import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getModules, addModule, deleteModule } from '../firebase/db';
import { DEFAULT_MODULES } from '../data/curriculum';
import { Notif, useNotif } from '../components/Notif';

const COLORS  = ['#00e5ff','#7c4dff','#ff6d3a','#ffd740','#00e676','#e040fb','#ff5252','#69f0ae'];
const ICONS   = ['💻','🗄️','📐','🌐','📝','📚','🧮','🔬','🎨','🧪','⚙️','📡','🔐','📊','🧠'];

export default function MyModules() {
  const { user } = useAuth();
  const { notif, showNotif } = useNotif();
  const [modules, setModules]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name,     setName]     = useState('');
  const [duration, setDuration] = useState(30);
  const [color,    setColor]    = useState(COLORS[0]);
  const [icon,     setIcon]     = useState(ICONS[0]);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => { loadMods(); }, [user]);

  async function loadMods() {
    setLoading(true);
    const mods = await getModules(user.uid);
    setModules(mods);
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await addModule(user.uid, { name: name.trim(), duration: Number(duration), color, icon });
    setName(''); setDuration(30); setColor(COLORS[0]); setIcon(ICONS[0]);
    setShowForm(false);
    await loadMods();
    showNotif('✓ Module added!');
    setSaving(false);
  }

  async function handleDelete(id) {
    await deleteModule(user.uid, id);
    setModules(m => m.filter(x => x.id !== id));
    showNotif('Module removed', 'info');
  }

  async function seedDefaults() {
    setSaving(true);
    for (const m of DEFAULT_MODULES) await addModule(user.uid, m);
    await loadMods();
    showNotif('✓ Default modules added!');
    setSaving(false);
  }

  return (
    <div style={{ padding:'20px 16px', maxWidth:520, margin:'0 auto' }}>
      <Notif notif={notif} />

      <div style={{ paddingTop:8, marginBottom:20 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:3, marginBottom:4 }}>Personalise</div>
        <h1 style={{ fontFamily:'var(--sans)', fontWeight:800, fontSize:28 }}>My <span style={{ color:'var(--accent)' }}>Modules</span></h1>
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
                display:'flex', alignItems:'center', gap:12,
                padding:'12px 14px', borderRadius:10,
                border:'1px solid var(--border)', background:'var(--surface)',
              }}>
                <span style={{ fontSize:22 }}>{mod.icon || '📖'}</span>
                <div style={{
                  width:4, height:36, borderRadius:2,
                  background: mod.color || 'var(--accent)', flexShrink:0
                }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600 }}>{mod.name}</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)' }}>{mod.duration} min</div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(mod.id)}>✕</button>
              </div>
            ))}
          </div>

          {/* Add form */}
          {showForm ? (
            <div className="card purple fade-in">
              <div className="card-label">➕ New Module</div>
              <form onSubmit={handleAdd} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <input className="input" placeholder="Module name (e.g. Machine Learning)" value={name} onChange={e => setName(e.target.value)} required />

                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <label style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', flexShrink:0 }}>Duration (min)</label>
                  <input className="input" type="number" min={5} max={180} value={duration}
                    onChange={e => setDuration(e.target.value)} style={{ width:80 }} />
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

                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-purple" type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Add Module'}
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </form>
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
