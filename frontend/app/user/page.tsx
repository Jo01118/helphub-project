'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { request } from '../utils/api';

export default function UserPortal() {
  const { t } = useLanguage();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access');
    const role = localStorage.getItem('userRole');
    if (token && role === 'USER') {
      window.location.href = '/user/dashboard';
    } else {
      setIsCheckingAuth(false);
    }
  }, []);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [wakingServer, setWakingServer] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRecoveryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setLoading(true); setErrorMsg(''); setSuccessMsg('');
    setWakingServer(false);
    
    const timeout = setTimeout(() => {
      setWakingServer(true);
    }, 4000);

    try {
      const data = await request('/auth/reset-password/', { 
        method: 'POST', 
        body: JSON.stringify({ 
          identifier, 
          recovery_code: recoveryCode, 
          new_password: newPassword 
        }) 
      });
      localStorage.setItem('access', data.access);
      if (data.refresh) localStorage.setItem('refresh', data.refresh);
      localStorage.setItem('userRole', 'USER');
      setSuccessMsg('Account recovered successfully. Redirecting...');
      setTimeout(() => {
        window.location.href = '/user/dashboard';
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Recovery failed. Check your code or credentials.');
    } finally { 
      clearTimeout(timeout);
      setWakingServer(false);
      setLoading(false); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setWakingServer(false);
    
    const timeout = setTimeout(() => {
      setWakingServer(true);
    }, 4000);

    try {
      if (isLogin) {
        // Login
        const data = await request('/auth/login/', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });
        localStorage.setItem('access', data.access);
        if (data.refresh) localStorage.setItem('refresh', data.refresh);
        window.location.href = '/user/dashboard';
      } else {
        // Registration
        const data = await request('/auth/register/', {
          method: 'POST',
          body: JSON.stringify({
            username,
            password,
            email,
            first_name: name,
            phone,
            city,
            age: parseInt(age) || null,
            role: 'USER'
          })
        });
        localStorage.setItem('access', data.access);
        if (data.refresh) localStorage.setItem('refresh', data.refresh);
        localStorage.setItem('userRole', 'USER');
        window.location.href = '/user/dashboard';
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication failed. Check your credentials.');
    } finally {
      clearTimeout(timeout);
      setWakingServer(false);
      setLoading(false);
    }
  };

  if (isCheckingAuth) return <main style={{ minHeight: '100vh', backgroundColor: 'var(--surface)' }}></main>;

  return (
    <main style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--surface)' }}>
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', borderTop: '5px solid var(--primary)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
          {isForgotPassword ? "Forgot Password" : isLogin ? "User Login" : "User Registration"}
        </h2>
        
        <div key={isForgotPassword ? 'forgot' : isLogin ? 'login' : 'register'} className="fade-in">
        {errorMsg && <div style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center', backgroundColor: 'rgba(231, 76, 60, 0.1)', padding: '10px', borderRadius: '5px' }}>{errorMsg}</div>}
        {successMsg && <div style={{ color: 'var(--success)', marginBottom: '1rem', textAlign: 'center', backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '10px', borderRadius: '5px' }}>{successMsg}</div>}

        {isForgotPassword ? (
          <div>
            <form onSubmit={handleRecoveryReset}>
              <input type="text" placeholder="Username, Email or Phone" required value={identifier} onChange={e => setIdentifier(e.target.value)} />
              <input type="text" placeholder="Enter 1 Recovery Code" required value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} />
              
              <div style={{ position: 'relative', width: '100%', marginBottom: '10px' }}>
                <input type={showPassword ? "text" : "password"} placeholder="New Password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%', paddingRight: '40px' }} />
                <span onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', userSelect: 'none', fontSize: '1.2rem' }}>
                  {showPassword ? '👁️' : '🙈'}
                </span>
              </div>
              
              <input type={showPassword ? "text" : "password"} placeholder="Confirm Password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                {wakingServer ? 'Waking backend... (~50s)' : loading ? 'Processing...' : 'Recover Account & Login'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => { setIsForgotPassword(false); setErrorMsg(''); setSuccessMsg(''); }}>
              Back to Login
            </p>
          </div>
        ) : isLogin ? (
          <form onSubmit={handleSubmit}>
            <input type="text" placeholder="Username" name="username_login" required value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" />
            <input type="password" placeholder={t('password')} name="password_login" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
            
            <p style={{ textAlign: 'right', marginTop: '0.5rem', marginBottom: '1rem', cursor: 'pointer', color: '#38bdf8', fontSize: '0.9rem' }} onClick={() => { setIsForgotPassword(true); setErrorMsg(''); setSuccessMsg(''); }}>
              Forgot Password?
            </p>
            
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              {wakingServer ? 'Waking backend... (~50s)' : loading ? 'Processing...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} autoComplete="off">
            <input type="text" placeholder={t('name')} value={name} onChange={e => setName(e.target.value)} autoComplete="off" />
            <input type="tel" placeholder={t('phone')} value={phone} onChange={e => setPhone(e.target.value)} autoComplete="off" />
            <input type="email" placeholder={t('email')} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            <input type="text" placeholder={t('city')} value={city} onChange={e => setCity(e.target.value)} autoComplete="off" />
            <input type="number" placeholder={t('age')} value={age} onChange={e => setAge(e.target.value)} autoComplete="off" />
            <input type="text" placeholder="Username" required value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" />
            <input type="password" placeholder={t('password')} required value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
            <input type="password" placeholder={t('confirm_password')} required autoComplete="new-password" />
            
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              {wakingServer ? 'Waking backend... (~50s)' : loading ? 'Processing...' : 'Register'}
            </button>
          </form>
        )}
        </div>

        {!isForgotPassword && (
          <p style={{ textAlign: 'center', marginTop: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}>
            {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
          </p>
        )}
        
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <a href="/access">{t('back')}</a>
        </div>
      </div>
    </main>
  );
}
