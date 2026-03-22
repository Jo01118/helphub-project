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
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrorMsg(''); setSuccessMsg('');
    try {
      const data = await request('/auth/request-otp/', { method: 'POST', body: JSON.stringify({ identifier }) });
      setIsOtpSent(true);
      setSuccessMsg('OTP sent! Please check your email or phone.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending OTP. Make sure your email/phone is registered.');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrorMsg(''); setSuccessMsg('');
    try {
      const data = await request('/auth/verify-otp/', { method: 'POST', body: JSON.stringify({ identifier, code: otpCode }) });
      localStorage.setItem('access', data.reset_token);
      setIsOtpVerified(true);
      setSuccessMsg('OTP Verified. You can now reset your password.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid OTP.');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrorMsg(''); setSuccessMsg('');
    try {
      await request('/auth/reset-password/', { method: 'POST', body: JSON.stringify({ new_password: newPassword }) });
      setSuccessMsg('Password reset successfully. Please login.');
      setTimeout(() => {
        setIsForgotPassword(false);
        setIsOtpSent(false);
        setIsOtpVerified(false);
        setIsLogin(true);
        setSuccessMsg('');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error resetting password.');
    } finally { setLoading(false); }
  };

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
    <main style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--surface)' }}>
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', borderTop: '5px solid var(--primary)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
          {isForgotPassword ? "Forgot Password" : isLogin ? t('user_login_title') : t('user_register_title')}
        </h2>
        
        <div key={isForgotPassword ? 'forgot' : isLogin ? 'login' : 'register'} className="fade-in">
        {errorMsg && <div style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center', backgroundColor: 'rgba(231, 76, 60, 0.1)', padding: '10px', borderRadius: '5px' }}>{errorMsg}</div>}
        {successMsg && <div style={{ color: 'var(--success)', marginBottom: '1rem', textAlign: 'center', backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '10px', borderRadius: '5px' }}>{successMsg}</div>}

        {isForgotPassword ? (
          <div>
            {!isOtpSent && !isOtpVerified && (
              <form onSubmit={handleRequestOtp}>
                <input type="text" placeholder="Registered Email or Phone" required value={identifier} onChange={e => setIdentifier(e.target.value)} />
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  {loading ? 'Processing...' : 'Send OTP'}
                </button>
              </form>
            )}
            {isOtpSent && !isOtpVerified && (
              <form onSubmit={handleVerifyOtp}>
                <input type="text" placeholder="Enter 6-digit OTP" required value={otpCode} onChange={e => setOtpCode(e.target.value)} />
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  {loading ? 'Processing...' : 'Verify OTP'}
                </button>
              </form>
            )}
            {isOtpVerified && (
              <form onSubmit={handleResetPassword}>
                <input type="password" placeholder="New Password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  {loading ? 'Processing...' : 'Reset Password'}
                </button>
              </form>
            )}
            <p style={{ textAlign: 'center', marginTop: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => { setIsForgotPassword(false); setIsOtpSent(false); setIsOtpVerified(false); setErrorMsg(''); setSuccessMsg(''); }}>
              Back to Login
            </p>
          </div>
        ) : isLogin ? (
          <form onSubmit={handleSubmit}>
            <input type="text" placeholder="Username" name="username" required value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
            <input type="password" placeholder={t('password')} name="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
            
            <p style={{ textAlign: 'right', marginTop: '0.5rem', marginBottom: '1rem', cursor: 'pointer', color: '#38bdf8', fontSize: '0.9rem' }} onClick={() => { setIsForgotPassword(true); setErrorMsg(''); setSuccessMsg(''); }}>
              Forgot Password?
            </p>
            
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              {loading ? 'Processing...' : 'Login'}
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
              {loading ? 'Processing...' : 'Register'}
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
