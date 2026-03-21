'use client';

import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { request } from '../utils/api';

export default function UserPortal() {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

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
        window.location.href = '/user/dashboard';
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fade-in" style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="glass-card" style={{ maxWidth: '500px', width: '100%' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
          {isLogin ? "User Login" : "User Registration"}
        </h2>
        
        {errorMsg && <div style={{ color: 'white', backgroundColor: 'var(--error)', padding: '10px', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} autoComplete="off">
          {!isLogin && (
            <>
              <input type="text" placeholder={t('name')} value={name} onChange={e => setName(e.target.value)} autoComplete="new-password" />
              <input type="tel" placeholder={t('phone')} value={phone} onChange={e => setPhone(e.target.value)} autoComplete="new-password" />
              <input type="email" placeholder={t('email')} value={email} onChange={e => setEmail(e.target.value)} autoComplete="new-password" />
              <input type="text" placeholder={t('city')} value={city} onChange={e => setCity(e.target.value)} autoComplete="new-password" />
              <input type="number" placeholder={t('age')} value={age} onChange={e => setAge(e.target.value)} autoComplete="new-password" />
            </>
          )}
          
          <input type="text" placeholder="Username" required value={username} onChange={e => setUsername(e.target.value)} autoComplete="new-password" />
          <input type="password" placeholder={t('password')} required value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
          
          {!isLogin && (
            <input type="password" placeholder={t('confirm_password')} required autoComplete="new-password" />
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Processing...' : t('submit')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}>
          {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
        </p>
        
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <a href="/access">{t('back')}</a>
        </div>
      </div>
    </main>
  );
}
