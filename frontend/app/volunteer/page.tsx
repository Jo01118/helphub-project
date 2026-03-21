'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { request, requestFormData } from '../utils/api';
import { searchLocationCoords } from '../utils/geocoding';

export default function VolunteerPortal() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'apply' | 'login' | 'status'>('apply');

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [resume, setResume] = useState<File | null>(null);

  const [volunteerId, setVolunteerId] = useState('');
  const [password, setPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [approvedData, setApprovedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Clear any expired tokens on load to prevent 401s on public forms
  useEffect(() => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (mode === 'status') {
        const data = await request('/auth/volunteer/status/', {
          method: 'POST',
          body: JSON.stringify({ volunteer_id: volunteerId }) 
        });
        
        if (data.status === 'PENDING') {
          setErrorMsg(data.message);
        } else if (data.status === 'REJECTED') {
          setErrorMsg(data.message);
        } else if (data.status === 'APPROVED') {
          setSuccessMsg(data.message);
          setApprovedData({ access: data.access, refresh: data.refresh });
        }
      } else if (mode === 'login') {
        const data = await request('/auth/login/', {
          method: 'POST',
          body: JSON.stringify({ username: volunteerId, password })
        });
        localStorage.setItem('access', data.access);
        if (data.refresh) localStorage.setItem('refresh', data.refresh);
        window.location.href = '/volunteer/dashboard';
      } else {
        // Registration (Apply without password)
        const formData = new FormData();
        formData.append('first_name', name);
        formData.append('phone', phone);
        formData.append('age', age);
        formData.append('city', locationCity);
        formData.append('role', 'VOLUNTEER');
        if (resume) {
          formData.append('resume', resume);
        }
        if (lat && lng) {
          formData.append('working_area_lat', lat);
          formData.append('working_area_long', lng);
        } else {
          throw new Error('Please capture your GPS location before submitting.');
        }
        
        const data = await requestFormData('/auth/register/', formData, 'POST');
        setSuccessMsg(`Application Submitted! Your Tracking ID is: ${data.volunteer_id}. Please save this ID to check your status or login later.`);
        setMode('status'); // Switch to status view automatically
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication failed. Check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fade-in" style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--surface)' }}>
      <div className="glass-card" style={{ maxWidth: '500px', width: '100%', borderTop: '5px solid var(--secondary)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--secondary)' }}>
          🤝 Volunteer Portal
        </h2>
        <p style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-muted)' }}>
          {mode === 'apply' ? 'Apply to become a volunteer.' : mode === 'status' ? 'Check your application status.' : 'Login to your dashboard.'}
        </p>

        {successMsg && <div style={{ color: 'black', backgroundColor: 'var(--success)', padding: '15px', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold' }}>{successMsg}</div>}
        {errorMsg && <div style={{ color: 'white', backgroundColor: 'var(--error)', padding: '10px', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>{errorMsg}</div>}

        {approvedData ? (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Your Tracking ID acts as your temporary login. Please proceed to the dashboard to set up your permanent username and password.</p>
            <button 
              className="btn-primary" 
              style={{ width: '100%', backgroundColor: 'var(--secondary)', color: 'black' }}
              onClick={() => {
                 localStorage.setItem('access', approvedData.access);
                 if (approvedData.refresh) localStorage.setItem('refresh', approvedData.refresh);
                 window.location.href = '/volunteer/dashboard';
              }}
            >
              Proceed to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} autoComplete="off">
            {mode === 'apply' ? (
              <>
                <input type="text" placeholder={t('name')} required value={name} onChange={(e) => setName(e.target.value)} autoComplete="new-password" />
                <input type="tel" placeholder={t('phone')} required value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="new-password" />
                <input type="number" placeholder="Age" required value={age} onChange={(e) => setAge(e.target.value)} autoComplete="new-password" />
                <div style={{ marginBottom: '1rem', textAlign: 'left', backgroundColor: 'rgba(52, 152, 219, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                  {lat && lng ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 'bold', display: 'block', margin: '5px 0' }}>
                          📍 Confirmed: {locationCity}
                        </span>
                        <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>
                          Coordinates: {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
                        </span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { setLat(''); setLng(''); }} 
                        style={{ padding: '8px 15px', backgroundColor: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ✏️ Re-enter location
                      </button>
                    </div>
                  ) : (
                    <>
                      <strong style={{ display: 'block', marginBottom: '10px' }}>📍 Search Location:</strong> 
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <input 
                          type="text" 
                          value={locationCity} 
                          onChange={e => setLocationCity(e.target.value)} 
                          placeholder="Type city or area (e.g. Tirupati, Andhra Pradesh)"
                          style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}
                        />
                        <button 
                          type="button" 
                          onClick={async () => {
                            if (!locationCity) {
                               setErrorMsg('Please enter a location to search.'); return;
                            }
                            setLocationLoading(true);
                            const coords = await searchLocationCoords(locationCity);
                            if (coords) {
                               setLat(coords.lat.toString()); setLng(coords.lng.toString());
                               if (coords.name) setLocationCity(coords.name);
                            } else {
                               setErrorMsg('Could not find GPS for this location. Please try adding more details.');
                            }
                            setLocationLoading(false);
                          }} 
                          className="btn-primary"
                          disabled={locationLoading}
                          style={{ padding: '0 20px', borderRadius: '6px' }}
                        >
                          {locationLoading ? 'Searching...' : 'Search'}
                        </button>
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Please search for a location to view the map and verify your coordinates before submitting.
                      </span>
                    </>
                  )}
                </div>

                <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Upload Resume</label>
                  <input type="file" required accept=".pdf,.doc,.docx" onChange={(e) => e.target.files && setResume(e.target.files[0])} />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem', backgroundColor: 'var(--secondary)', color: 'black' }} disabled={loading}>
                  {loading ? 'Processing...' : 'Submit Application'}
                </button>
              </>
            ) : mode === 'status' ? (
              <>
                <input type="text" placeholder="Enter Tracking ID (e.g. VOL-XXXX)" required value={volunteerId} onChange={(e) => setVolunteerId(e.target.value)} autoComplete="new-password" />
                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem', backgroundColor: 'var(--secondary)', color: 'black' }} disabled={loading}>
                  {loading ? 'Processing...' : 'Check Status'}
                </button>
              </>
            ) : (
              <>
                <input type="text" placeholder="Username (or Tracking ID)" required value={volunteerId} onChange={(e) => setVolunteerId(e.target.value)} autoComplete="new-password" />
                <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem', backgroundColor: 'var(--secondary)', color: 'black' }} disabled={loading}>
                  {loading ? 'Processing...' : 'Login'}
                </button>
              </>
            )}
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1.5rem' }}>
          {mode !== 'apply' && <button onClick={() => { setMode('apply'); setErrorMsg(''); setSuccessMsg(''); setApprovedData(null); }} style={{ background: 'none', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer' }}>New Volunteer? Apply Here</button>}
          {mode !== 'status' && <button onClick={() => { setMode('status'); setErrorMsg(''); setSuccessMsg(''); setApprovedData(null); }} style={{ background: 'none', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer' }}>Check Application Status</button>}
          {mode !== 'login' && <button onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); setApprovedData(null); }} style={{ background: 'none', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer' }}>Already Approved? Login</button>}
        </div>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <a href="/access">{t('back')}</a>
        </div>
      </div>
    </main>
  );
}
