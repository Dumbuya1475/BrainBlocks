import { Outlet, NavLink } from 'react-router-dom';

const NAV = [
  { to:'/',        icon:'🏠', label:'Home'    },
  { to:'/track',   icon:'📅', label:'Tracker' },
  { to:'/modules', icon:'⚙️',  label:'Modules' },
  { to:'/log',     icon:'📓', label:'Log'     },
  { to:'/profile', icon:'👤', label:'Profile' },
];

export default function Layout() {
  return (
    <div style={{ paddingBottom: 72 }}>
      <Outlet />
      <nav style={{
        position:'fixed', bottom:0, left:0, right:0,
        background:'rgba(13,18,27,0.96)',
        backdropFilter:'blur(12px)',
        borderTop:'1px solid var(--border)',
        display:'flex',
        zIndex:50,
      }}>
        {NAV.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            style={({ isActive }) => ({
              flex:1, display:'flex', flexDirection:'column',
              alignItems:'center', gap:3, padding:'10px 4px',
              textDecoration:'none',
              color: isActive ? 'var(--accent)' : 'var(--muted)',
              fontFamily:'var(--mono)', fontSize:10,
              textTransform:'uppercase', letterSpacing:'1px',
              transition:'color 0.15s',
            })}
          >
            <span style={{ fontSize:18, lineHeight:1 }}>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
