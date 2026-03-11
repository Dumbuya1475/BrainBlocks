import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode]     = useState('login'); // 'login' | 'register'
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [pass, setPass]     = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function getAuthErrorMessage(e, method = 'generic') {
    const code = e?.code || '';
    if (code === 'auth/operation-not-allowed') {
      if (method === 'email-register' || method === 'email-login') {
        return 'Email/Password authentication is disabled for BrainBlocks. In Firebase Console for project brainblocks-e3e01, enable Email/Password in Authentication → Sign-in method.';
      }
      if (method === 'google') {
        return 'Google sign-in is disabled for BrainBlocks. In Firebase Console for project brainblocks-e3e01, enable Google in Authentication → Sign-in method.';
      }
      return 'A required sign-in method is disabled in Firebase Console for project brainblocks-e3e01.';
    }
    if (code === 'auth/invalid-api-key') {
      return 'Invalid Firebase API key. Check src/firebase/config.js values.';
    }
    if (code === 'auth/app-not-authorized') {
      return 'App not authorized for this Firebase project. Verify your web app config in src/firebase/config.js.';
    }
    if (code === 'auth/configuration-not-found') {
      return 'Authentication configuration not found. Ensure Email/Password or Google provider is enabled in the same Firebase project as your config.';
    }
    if (code === 'auth/unauthorized-domain') {
      return 'This domain is not authorized. Add localhost and your site domain in Firebase Authentication → Settings → Authorized domains.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in was canceled. Please try again.';
    }
    if (code === 'auth/invalid-credential') {
      return 'Invalid credentials. Check your email and password.';
    }
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password') {
      return 'Incorrect email or password.';
    }
    const msg = (e?.message || 'Authentication failed.').replace('Firebase: ', '');
    return code ? `${msg} (code: ${code})` : msg;
  }

  async function handleGoogle() {
    try { setLoading(true); await loginWithGoogle(); navigate('/'); }
    catch(e) { setError(getAuthErrorMessage(e, 'google')); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (mode === 'login') await loginWithEmail(email, pass);
      else await registerWithEmail(email, pass, name);
      navigate('/');
    } catch(e) { setError(getAuthErrorMessage(e, mode === 'login' ? 'email-login' : 'email-register')); }
    finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex',
      alignItems:'center', justifyContent:'center',
      padding:'20px',
    }}>
      <div style={{ width:'100%', maxWidth:400 }} className="fade-in">

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', letterSpacing:3, textTransform:'uppercase', marginBottom:8 }}>
            Limkokwing · SL
          </div>
          <h1 style={{ fontFamily:'var(--sans)', fontWeight:800, fontSize:36, lineHeight:1 }}>
            Brain<span style={{ color:'var(--accent)' }}>Blocks</span>
          </h1>
          <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginTop:8 }}>
            Your personal study companion
          </p>
        </div>

        <div className="card">
          {/* Google */}
          <button
            className="btn btn-ghost"
            onClick={handleGoogle}
            disabled={loading}
            style={{ width:'100%', justifyContent:'center', marginBottom:16, padding:'12px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
            <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)' }}>or</span>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
          </div>

          {/* Toggle */}
          <div style={{ display:'flex', background:'var(--surface2)', borderRadius:8, padding:3, marginBottom:16 }}>
            {['login','register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex:1, padding:'7px', border:'none', borderRadius:6,
                  background: mode === m ? 'var(--accent2)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--muted)',
                  fontFamily:'var(--mono)', fontSize:10, textTransform:'uppercase',
                  letterSpacing:'1px', transition:'all 0.15s',
                }}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {mode === 'register' && (
              <input className="input" placeholder="Your name" value={name}
                onChange={e => setName(e.target.value)} required />
            )}
            <input className="input" type="email" placeholder="Email address" value={email}
              onChange={e => setEmail(e.target.value)} required />
            <input className="input" type="password" placeholder="Password" value={pass}
              onChange={e => setPass(e.target.value)} required minLength={6} />

            {error && (
              <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--red)', lineHeight:1.5 }}>
                {error}
              </p>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ justifyContent:'center', padding:'12px' }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', marginTop:20 }}>
          Your data is saved to your account · Works offline after first load
        </p>
      </div>
    </div>
  );
}
