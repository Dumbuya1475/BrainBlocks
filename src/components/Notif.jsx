import { useState, useCallback } from 'react';

let _show = null;
export function useNotif() {
  const [notif, setNotif] = useState(null);
  _show = useCallback((msg, type = 'success') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 2800);
  }, []);
  return { notif, showNotif: _show };
}

export function showNotif(msg, type) { if (_show) _show(msg, type); }

export function Notif({ notif }) {
  if (!notif) return null;
  const colors = {
    success: { border:'var(--green)',   color:'var(--green)'   },
    error:   { border:'var(--red)',     color:'var(--red)'     },
    info:    { border:'var(--accent)',  color:'var(--accent)'  },
  };
  const c = colors[notif.type] || colors.success;
  return (
    <div style={{
      position:'fixed', bottom:80, left:'50%',
      transform:'translateX(-50%)',
      background:'var(--surface)',
      border:`1px solid ${c.border}`,
      color: c.color,
      fontFamily:'var(--mono)', fontSize:12,
      padding:'10px 22px', borderRadius:8,
      zIndex:300, whiteSpace:'nowrap',
      animation:'slideUp 0.3s ease',
      pointerEvents:'none',
    }}>
      {notif.msg}
    </div>
  );
}
