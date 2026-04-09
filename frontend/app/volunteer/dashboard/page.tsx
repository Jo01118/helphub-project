'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { request, requestFormData, BASE_URL } from '../../utils/api';
import { getLocationName, searchLocationCoords } from '../../utils/geocoding';

export default function VolunteerDashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'assigned' | 'nearby' | 'profile' | 'requests'>('assigned');
  const [assignmentRequests, setAssignmentRequests] = useState<any[]>([]);
  
  // Profile State
  const [userData, setUserData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [volUserId, setVolUserId] = useState<number | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolveProof, setResolveProof] = useState<File | null>(null);
  const [requestContactId, setRequestContactId] = useState<number | null>(null);
  const [contactReasonText, setContactReasonText] = useState('');
  
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [toastMsg, setToastMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  const showToast = (text: string, type: 'success'|'error' = 'error') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };
  
  // Volunteer Location state
  const [volLat, setVolLat] = useState<number | null>(null);
  const [volLng, setVolLng] = useState<number | null>(null);
  const [volLocationName, setVolLocationName] = useState<string>('Locating...');
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('access')) {
      router.push('/volunteer');
      return;
    }

    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'assigned' || hash === 'nearby' || hash === 'profile' || hash === 'requests') {
        setActiveTab(hash as any);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);

    
    // Request real location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setVolLat(position.coords.latitude);
          setVolLng(position.coords.longitude);
        },
        () => {
           // Fallback if denied
           setVolLat(17.3850);
           setVolLng(78.4867);
        }
      );
    } else {
       setVolLat(17.3850);
       setVolLng(78.4867);
    }
    
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    if (volLat !== null && volLng !== null) {
      getLocationName(volLat, volLng).then(setName => setVolLocationName(setName));
      fetchUserProfile();
      fetchReports();
      fetchRequests();
    }
  }, [volLat, volLng]);

  const fetchRequests = async () => {
    try {
      const data = await request('/assignment-requests/');
      setAssignmentRequests(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const data = await request('/auth/me/');
      setVolUserId(data.id);
      setUserData(data);
      if (data.username && data.username.startsWith('VOL-')) {
        setShowSetupModal(true);
      }
    } catch (err: any) {
      console.error('Failed to parse user profile', err);
      if (err.message && (err.message.includes('token') || err.message.includes('credentials') || err.message.includes('Time out'))) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('userRole');
        window.location.href = '/volunteer';
      }
    }
  };

  const fetchReports = async () => {
    // Check session cache for instant load
    const cached = sessionStorage.getItem('volunteer_reports_cache');
    if (cached) {
      setReports(JSON.parse(cached));
    }

    setLoadingReports(true);
    try {
      const data = await request('/reports/');

      // Calculate distances locally so we can show results immediately without crashing
      const currentLat = volLat || 17.3850;
      const currentLng = volLng || 78.4867;
      const deg2rad = (deg: number) => deg * (Math.PI/180);
      const R = 6371;

      const resultsWithDistance = data.map((r: any) => {
        const dLat = deg2rad(r.latitude - currentLat);
        const dLon = deg2rad(r.longitude - currentLng); 
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(currentLat)) * Math.cos(deg2rad(r.latitude)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        return { ...r, distance: R * c };
      });

      setReports(resultsWithDistance);
      sessionStorage.setItem('volunteer_reports_cache', JSON.stringify(resultsWithDistance));

      // Resolve location names lazily in background
      const updatedData = [...resultsWithDistance];
      const promises = resultsWithDistance.map(async (r: any, idx: number) => {
         if (!r.location_name) {
           const name = await getLocationName(r.latitude, r.longitude);
           updatedData[idx] = { ...updatedData[idx], location_name: name };
         }
      });
      Promise.all(promises).then(() => {
        setReports(updatedData);
        sessionStorage.setItem('volunteer_reports_cache', JSON.stringify(updatedData));
      });
      
    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes('token') || err.message.includes('credentials') || err.message.includes('Time out'))) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('userRole');
        router.push('/volunteer');
      }
    } finally {
      setLoadingReports(false);
    }
  };

  const requestAssignment = async (id: number) => {
    if (!volUserId) return;
    try {
       await request(`/assignment-requests/`, {
         method: 'POST',
         body: JSON.stringify({ report: id })
       });
       fetchReports();
       fetchRequests();
       showToast("Assignment request submitted! Awaiting Admin approval.", "success");
       setActiveTab('requests');
    } catch(err: any) {
       let msg = err.message;
       // Parse DRF array error if present
       if (msg.includes('non_field_errors')) { msg = "You have already requested this assignment."; }
       showToast(`Failed to request: ${msg}`);
    }
  }

  const handleResolve = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!resolvingId) return;
     try {
        const formData = new FormData();
        formData.append('status', 'RESOLVED');
        if (resolveProof) {
          formData.append('resolved_proof', resolveProof);
        }
        await requestFormData(`/reports/${resolvingId}/`, formData, 'PATCH');
        setResolvingId(null);
        setResolveProof(null);
        fetchReports();
        showToast('Report resolved successfully! Proof saved.', 'success');
     } catch(err: any) {
        showToast('Failed to resolve: ' + err.message);
     }
  };

   const handleRequestContact = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!requestContactId || !contactReasonText) return;
      try {
        await request(`/reports/${requestContactId}/`, {
          method: 'PATCH',
          body: JSON.stringify({ contact_request_reason: contactReasonText })
        });
        fetchReports();
        setRequestContactId(null);
        setContactReasonText('');
        showToast("Request successfully sent to Admin for approval.", "success");
      } catch (err: any) {
        showToast('Failed to request contact: ' + err.message);
      }
   };

  // Determine assigned vs nearby
  // For this prototype, we'll consider IN_PROGRESS to be Assigned, and PENDING to be Nearby Unassigned.
  const assignedReports = reports.filter(r => r.status === 'IN_PROGRESS' || r.status === 'ACCEPTED');
  const nearbyReports = reports.filter(r => r.status === 'PENDING').sort((a,b) => a.distance - b.distance);

  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('userRole');
    window.location.href = '/';
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const updated = await request('/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({
          username: userData.username,
          first_name: userData.first_name,
          email: userData.email,
          phone: userData.phone,
          city: userData.city,
          age: parseInt(userData.age) || null
        })
      });
      setUserData(updated);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSetupAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');
    setSetupLoading(true);
    try {
      const data = await request('/auth/update-credentials/', {
        method: 'POST',
        body: JSON.stringify({ username: newUsername, password: newPassword })
      });
      localStorage.setItem('access', data.access);
      if (data.refresh) localStorage.setItem('refresh', data.refresh);
      showToast('Account setup complete! You can now use these credentials to log in.', 'success');
      setShowSetupModal(false);
    } catch (err: any) {
      setSetupError(err.message || 'Failed to update credentials. Username might be taken.');
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--surface)', padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ color: 'var(--secondary)', fontSize: '1.25rem', fontWeight: 600 }}>{t('vol_dashboard_title')}</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', border: '1px solid var(--error)', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
          {t('logout')}
        </button>
      </header>

      {/* Setup Modal */}
      {showSetupModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--surface)', borderTop: '5px solid var(--secondary)' }}>
            <h2 style={{ textAlign: 'center', color: 'var(--secondary)', marginBottom: '1rem' }}>{t('welcome_helphub')}</h2>
            <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {t('setup_credentials_help')}
            </p>
            {setupError && <div style={{ color: 'white', backgroundColor: 'var(--error)', padding: '10px', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>{setupError}</div>}
            
            <form onSubmit={handleSetupAccount}>
              <input type="text" placeholder={t('username_placeholder')} required value={newUsername} onChange={e => setNewUsername(e.target.value)} />
              <input type="password" placeholder={t('password_placeholder')} required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem', backgroundColor: 'var(--secondary)', color: 'black' }} disabled={setupLoading}>
                {setupLoading ? t('saving') : t('save_continue')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Location Confirmation Step */}
      <div style={{ padding: '1rem 1rem 0 1rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '800px' }}>
          <div className="glass-card fade-in" style={{ marginBottom: isLocationConfirmed ? '1rem' : '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>📍 {isLocationConfirmed ? t('active_nav_point') : t('step_1_confirm_loc')}</h2>
            
            {isLocationConfirmed ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid var(--success)' }}>
                <div>
                  <span style={{ fontSize: '1.1rem', color: 'var(--success)', fontWeight: 'bold', display: 'block', margin: '5px 0' }}>
                    ✅ {volLocationName}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>
                    GPS: {volLat?.toFixed(6)}, {volLng?.toFixed(6)}
                  </span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsLocationConfirmed(false)} 
                  style={{ padding: '8px 15px', backgroundColor: 'transparent', border: '1px solid var(--success)', color: 'var(--success)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ✏️ Change Location
                </button>
              </div>
            ) : (
              <div style={{ backgroundColor: 'rgba(52, 152, 219, 0.05)', padding: '20px', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <input 
                    type="text" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    placeholder={t('search_location_volunteer')}
                    style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  />
                  <button 
                    type="button" 
                    onClick={async () => {
                      if (!searchQuery) return;
                      setIsSearching(true);
                      const result = await searchLocationCoords(searchQuery);
                      setIsSearching(false);
                      if (result) {
                        setVolLat(result.lat);
                        setVolLng(result.lng);
                        setVolLocationName(result.name || searchQuery);
                      } else {
                        showToast("Location not found.");
                      }
                    }} 
                    className="btn-primary"
                    disabled={isSearching}
                    style={{ padding: '0 20px', borderRadius: '6px' }}
                  >
                    {isSearching ? '...' : t('search_button')}
                  </button>
                </div>

                {volLat !== null && volLng !== null ? (
                   <div>
                     <iframe 
                       width="100%" 
                       height="250" 
                       style={{ border: '2px solid var(--border)', borderRadius: '8px', marginTop: '15px', marginBottom: '15px' }} 
                       src={`https://www.openstreetmap.org/export/embed.html?bbox=${volLng-0.02}%2C${volLat-0.02}%2C${volLng+0.02}%2C${volLat+0.02}&layer=mapnik&marker=${volLat}%2C${volLng}`}
                     ></iframe>

                     <button 
                       type="button"
                       className="btn-primary"
                       style={{ width: '100%', backgroundColor: 'var(--success)', padding: '12px', fontSize: '1rem' }}
                       onClick={() => setIsLocationConfirmed(true)}
                     >
                       ✅ Confirm My Location & View Tasks
                     </button>
                   </div>
                 ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'block', textAlign: 'center', padding: '20px' }}>
                      Fetching initial GPS or awaiting manual search...
                    </span>
                 )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isLocationConfirmed && (
        <>
          {/* Tabs removed for global hamburger nav */}

      {loadingReports && reports.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading tasks securely...</div>
      ) : (
        <div style={{ padding: '1rem', flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '800px' }}>
            
            {activeTab === 'assigned' && (
              <div className="fade-in">
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>Your Tasks</h2>
                {assignedReports.length === 0 ? <p className="glass-card">No tasks assigned to your name currently.</p> : assignedReports.map(report => (
                  <div key={report.id} className="glass-card" style={{ marginBottom: '1.5rem', borderLeft: '5px solid var(--secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                      <span style={{ fontWeight: 'bold' }}>Report</span>
                      <span style={{ backgroundColor: '#e67e22', color: 'white', padding: '4px 10px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {report.status}
                      </span>
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                      {(() => {
                        const textRaw = report.text || '';
                        const categoryMatch = textRaw.match(/\[Category\]:\s*(.*?)(?:\r?\n|\[|$)/i);
                        const issueMatch = textRaw.match(/\[Issue\]:\s*(.*?)(?:\r?\n|\[|$)/i);
                        const voiceMatch = textRaw.match(/\[Voice\]:\s*([\s\S]*?)(?:\r?\n\r?\n|\[Text\]:|$)/i);
                        const manualMatch = textRaw.match(/\[Text\]:\s*([\s\S]*?)(?:\r?\n\[Location Info\]:|$)/i);

                        const category = categoryMatch ? categoryMatch[1].trim() : 'not provided';
                        const issue = issueMatch ? issueMatch[1].trim() : 'not provided';
                        const voicePart = voiceMatch ? voiceMatch[1].trim() : '';
                        const manualPart = manualMatch ? manualMatch[1].trim() : '';

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <div style={{ flex: 1, backgroundColor: 'rgba(52, 152, 219, 0.1)', padding: '8px', borderRadius: '6px', border: '1px solid var(--primary)' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Category</span>
                                <strong style={{ fontSize: '0.9rem' }}>{category || 'not provided'}</strong>
                              </div>
                              <div style={{ flex: 1, backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '8px', borderRadius: '6px', border: '1px solid var(--success)' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Issue Type</span>
                                <strong style={{ fontSize: '0.9rem' }}>{issue || 'not provided'}</strong>
                              </div>
                            </div>
                            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                              <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>🎤 Voice Transcript:</strong>
                              <p style={{ margin: 0, fontSize: '0.9rem', color: voicePart ? 'var(--text-main)' : 'var(--text-muted)' }}>{voicePart || 'not provided'}</p>
                            </div>
                            <div>
                              <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>📝 Description:</strong>
                              <p style={{ margin: 0, fontSize: '0.9rem', color: manualPart ? 'var(--text-main)' : 'var(--text-muted)' }}>{manualPart || 'not provided'}</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    
                    {report.photo ? (
                      <img src={report.photo.startsWith('http') || report.photo.startsWith('data:') ? report.photo : `${BASE_URL}${report.photo}`} alt="Report" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '15px' }} />
                    ) : (
                      <div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px dashed var(--border)', textAlign: 'center', marginBottom: '3px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        🖼️ No photo provided
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                      <div style={{ backgroundColor: 'rgba(52, 152, 219, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Your Location</p>
                        <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {volLocationName}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>{volLat?.toFixed(4)}, {volLng?.toFixed(4)}</div>
                      </div>

                      <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Issue Location</p>
                        <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🚨 {report.location_name}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>{report.latitude?.toFixed(4)}, {report.longitude?.toFixed(4)}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface)', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid var(--border)' }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Distance to Issue</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--secondary)' }}>{report.distance.toFixed(1)} km</strong>
                      </div>
                      <a href={`https://www.google.com/maps/dir/?api=1&origin=${volLat},${volLng}&destination=${report.latitude},${report.longitude}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#3498db', color: 'white', padding: '10px 15px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.95rem' }}>
                        🗺️ Navigate
                      </a>
                    </div>

                    {(() => {
                        const hasContactInfo = report.contact_info || (report.user_details && report.user_details.email) || (report.user_details && report.user_details.username);
                        const contactString = report.contact_info || (report.user_details && report.user_details.email) || (report.user_details && report.user_details.username);
                        
                        if (!hasContactInfo) return null;

                        if (report.contact_shared) {
                           return (
                             <div style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid var(--success)' }}>
                               <strong style={{ display: 'block', color: 'var(--success)', marginBottom: '5px' }}>{t('user_contact_info')}</strong>
                               <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{contactString}</span>
                             </div>
                           );
                        } else {
                           return (
                             <div style={{ marginBottom: '15px', backgroundColor: 'rgba(52, 152, 219, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                               {report.contact_request_reason ? (
                                  <div>
                                    <strong style={{ display: 'block', color: 'var(--primary)', marginBottom: '5px' }}>{t('contact_info_requested')}</strong>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('pending_admin_approval')} Reason: "{report.contact_request_reason}"</span>
                                  </div>
                               ) : requestContactId === report.id ? (
                                  <form onSubmit={handleRequestContact} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{t('contact_reason_label')}</label>
                                    <textarea rows={2} required value={contactReasonText} onChange={e => setContactReasonText(e.target.value)} placeholder={t('contact_reason_placeholder')} style={{ padding: '10px', borderRadius: '5px', border: '1px solid var(--border)' }} />
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                      <button type="submit" className="btn-primary" style={{ flex: 1 }}>{t('submit_request_admin')}</button>
                                      <button type="button" onClick={() => { setRequestContactId(null); setContactReasonText(''); }} className="btn-primary" style={{ backgroundColor: 'var(--error)' }}>{t('cancel')}</button>
                                    </div>
                                  </form>
                               ) : (
                                   <button style={{ width: '100%', padding: '15px', background: 'transparent', backgroundColor: 'var(--surface)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontSize: '1rem' }} 
                                     onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                                     onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                     onClick={() => setRequestContactId(report.id)}>
                                     {t('request_user_contact')}
                                   </button>
                               )}
                             </div>
                           )
                        }
                    })()}

                    {resolvingId === report.id ? (
                      <form onSubmit={handleResolve} className="fade-in" style={{ marginTop: '15px', backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid var(--success)' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '10px', color: 'var(--success)' }}>{t('finalizing_resolution')}</p>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-main)' }}>{t('upload_proof_help')}</label>
                        <input type="file" accept="image/*,video/*" onChange={e => { if(e.target.files) setResolveProof(e.target.files[0])}} style={{ marginBottom: '15px', width: '100%' }} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button type="submit" className="btn-primary" style={{ flex: 1, backgroundColor: 'var(--success)' }}>{t('upload_resolve')}</button>
                          <button type="button" onClick={() => { setResolvingId(null); setResolveProof(null); }} className="btn-primary" style={{ backgroundColor: 'var(--error)' }}>{t('cancel')}</button>
                        </div>
                      </form>
                    ) : (
                      <button className="btn-primary" style={{ width: '100%', backgroundColor: 'var(--success)' }} onClick={() => setResolvingId(report.id)}>
                        {t('mark_resolved')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'nearby' && (
              <div className="fade-in">
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>Nearby Reports</h2>
                {nearbyReports.length === 0 ? <p className="glass-card">No pending nearby issues. Great job community!</p> : nearbyReports.map(report => (
                  <div key={report.id} className="glass-card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                      <span style={{ fontWeight: 'bold' }}>Report</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                        <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>{report.distance.toFixed(1)} km away</span>
                        <a href={`https://www.google.com/maps/dir/?api=1&origin=${volLat},${volLng}&destination=${report.latitude},${report.longitude}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', backgroundColor: '#e74c3c', color: 'white', padding: '5px 8px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.75rem' }}>
                          🗺️ View Map
                        </a>
                      </div>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      {(() => {
                        const textRaw = report.text || '';
                        const categoryMatch = textRaw.match(/\[Category\]:\s*(.*?)(?:\r?\n|\[|$)/i);
                        const issueMatch = textRaw.match(/\[Issue\]:\s*(.*?)(?:\r?\n|\[|$)/i);
                        const voiceMatch = textRaw.match(/\[Voice\]:\s*([\s\S]*?)(?:\r?\n\r?\n|\[Text\]:|$)/i);
                        const manualMatch = textRaw.match(/\[Text\]:\s*([\s\S]*?)(?:\r?\n\[Location Info\]:|$)/i);

                        const category = categoryMatch ? categoryMatch[1].trim() : 'not provided';
                        const issue = issueMatch ? issueMatch[1].trim() : 'not provided';
                        const voicePart = voiceMatch ? voiceMatch[1].trim() : '';
                        const manualPart = manualMatch ? manualMatch[1].trim() : '';

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <div style={{ flex: 1, backgroundColor: 'rgba(52, 152, 219, 0.1)', padding: '8px', borderRadius: '6px', border: '1px solid var(--primary)' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Category</span>
                                <strong style={{ fontSize: '0.9rem' }}>{category || 'not provided'}</strong>
                              </div>
                              <div style={{ flex: 1, backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '8px', borderRadius: '6px', border: '1px solid var(--success)' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Issue Type</span>
                                <strong style={{ fontSize: '0.9rem' }}>{issue || 'not provided'}</strong>
                              </div>
                            </div>
                            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                              <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>🎤 Voice Transcript:</strong>
                              <p style={{ margin: 0, fontSize: '0.9rem', color: voicePart ? 'var(--text-main)' : 'var(--text-muted)' }}>{voicePart || 'not provided'}</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    {report.photo ? (
                      <img src={report.photo.startsWith('http') || report.photo.startsWith('data:') ? report.photo : `${BASE_URL}${report.photo}`} alt="Report" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '15px' }} />
                    ) : (
                      <div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px dashed var(--border)', textAlign: 'center', marginBottom: '15px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        🖼️ No photo provided
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                      <div style={{ backgroundColor: 'rgba(52, 152, 219, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Your Location</p>
                        <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {volLocationName}</strong>
                      </div>
                      <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Issue Location</p>
                        <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🚨 {report.location_name}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface)', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid var(--border)' }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Distance to Issue</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--secondary)' }}>{report.distance.toFixed(1)} km</strong>
                      </div>
                      <a href={`https://www.google.com/maps/dir/?api=1&origin=${volLat},${volLng}&destination=${report.latitude},${report.longitude}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#3498db', color: 'white', padding: '10px 15px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.95rem' }}>
                        🗺️ View Map
                      </a>
                    </div>
                    <button className="btn-primary" style={{ width: '100%' }} onClick={() => requestAssignment(report.id)}>
                      ✋ Request Assignment
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="fade-in">
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>Your Requested Assignments</h2>
                {assignmentRequests.length === 0 ? <p className="glass-card">You haven't requested any assignments yet.</p> : assignmentRequests.map(req => (
                  <div key={req.id} className="glass-card" style={{ marginBottom: '1.5rem', borderLeft: req.status === 'APPROVED' ? '5px solid var(--success)' : req.status === 'REJECTED' ? '5px solid var(--error)' : '5px solid orange' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                      <span style={{ fontWeight: 'bold' }}>Assignment Request Status:</span>
                      <span style={{ backgroundColor: req.status === 'APPROVED' ? 'var(--success)' : req.status === 'REJECTED' ? 'var(--error)' : 'orange', color: req.status === 'PENDING' ? 'black' : 'white', padding: '4px 10px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {req.status}
                      </span>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      {(() => {
                        const textRaw = req.report_details?.text || '';
                        const categoryMatch = textRaw.match(/\[Category\]:\s*(.*?)(?:\r?\n|\[|$)/i);
                        const issueMatch = textRaw.match(/\[Issue\]:\s*(.*?)(?:\r?\n|\[|$)/i);
                        const voiceMatch = textRaw.match(/\[Voice\]:\s*([\s\S]*?)(?:\r?\n\r?\n|\[Text\]:|$)/i);
                        const manualMatch = textRaw.match(/\[Text\]:\s*([\s\S]*?)(?:\r?\n\[Location Info\]:|$)/i);

                        const category = categoryMatch ? categoryMatch[1].trim() : 'not provided';
                        const issue = issueMatch ? issueMatch[1].trim() : 'not provided';
                        const voicePart = voiceMatch ? voiceMatch[1].trim() : '';
                        const manualPart = manualMatch ? manualMatch[1].trim() : '';

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <div style={{ flex: 1, backgroundColor: 'rgba(52, 152, 219, 0.1)', padding: '8px', borderRadius: '6px', border: '1px solid var(--primary)' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Category</span>
                                <strong style={{ fontSize: '0.9rem' }}>{category || 'not provided'}</strong>
                              </div>
                              <div style={{ flex: 1, backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '8px', borderRadius: '6px', border: '1px solid var(--success)' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Issue Type</span>
                                <strong style={{ fontSize: '0.9rem' }}>{issue || 'not provided'}</strong>
                              </div>
                            </div>
                            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                              <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>🎤 Voice Transcript:</strong>
                              <p style={{ margin: 0, fontSize: '0.9rem', color: voicePart ? 'var(--text-main)' : 'var(--text-muted)' }}>{voicePart || 'not provided'}</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ backgroundColor: 'rgba(52, 152, 219, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                       <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🚨 {req.report_details?.location_name || 'Location'}</strong>
                       <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>{req.report_details?.latitude?.toFixed(4)}, {req.report_details?.longitude?.toFixed(4)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {activeTab === 'profile' && userData && (
              <div className="glass-card fade-in">
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--secondary)' }}>My Volunteer Profile</h2>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  <p style={{ margin: '0 0 5px 0', color: 'var(--text-muted)' }}>Volunteer Account ID (Username)</p>
                  <strong style={{ fontSize: '1.2rem' }}>{userData.username}</strong>
                </div>
                
                {profileMsg.text && (
                  <div style={{ padding: '10px', borderRadius: '8px', marginBottom: '1rem', backgroundColor: profileMsg.type === 'success' ? 'var(--success)' : 'var(--error)', color: profileMsg.type === 'success' ? 'black' : 'white', textAlign: 'center', fontWeight: 'bold' }}>
                    {profileMsg.text}
                  </div>
                )}
                
                <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontWeight: 600 }}>Username</label>
                    <input type="text" value={userData.username || ''} onChange={e => setUserData({...userData, username: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontWeight: 600 }}>Full Name</label>
                    <input type="text" value={userData.first_name || ''} onChange={e => setUserData({...userData, first_name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                       <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontWeight: 600 }}>Phone Number</label>
                       <input type="tel" value={userData.phone || ''} onChange={e => setUserData({...userData, phone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                       <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontWeight: 600 }}>Age</label>
                       <input type="number" value={userData.age || ''} onChange={e => setUserData({...userData, age: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontWeight: 600 }}>Email Address</label>
                    <input type="email" value={userData.email || ''} onChange={e => setUserData({...userData, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontWeight: 600 }}>City / Location</label>
                    <input type="text" value={userData.city || ''} onChange={e => setUserData({...userData, city: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                  </div>
                  <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '15px', fontSize: '1.1rem', backgroundColor: 'var(--secondary)', color: 'black' }} disabled={profileLoading}>
                    {profileLoading ? 'Saving Changes...' : 'Save Profile Details'}
                  </button>
                </form>

                <div style={{ marginTop: '2rem', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <h3 style={{ marginBottom: '10px', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Account Recovery Codes
                    <button 
                      onClick={() => setShowRecoveryCodes(!showRecoveryCodes)}
                      style={{ fontSize: '0.9rem', padding: '5px 10px', backgroundColor: 'var(--secondary)', color: 'black', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      {showRecoveryCodes ? 'Hide' : 'Reveal'}
                    </button>
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>
                    Save these 4 unique codes somewhere safe. If you forget your password, you can use ONE of these codes to log back into your account. Each code can only be used once.
                  </p>
                  
                  {showRecoveryCodes ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {userData.recovery_codes && userData.recovery_codes.length > 0 ? (
                        userData.recovery_codes.map((code: string, idx: number) => (
                          <div key={idx} style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '10px 5px', borderRadius: '6px', textAlign: 'center', fontFamily: 'monospace', fontSize: '1rem', fontWeight: 'bold', letterSpacing: '1px', color: 'var(--primary)', wordBreak: 'break-all' }}>
                            {code}
                          </div>
                        ))
                      ) : (
                        <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--error)' }}>
                          No active recovery codes available. Please contact support.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div style={{ filter: 'blur(5px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', userSelect: 'none', pointerEvents: 'none' }}>
                      {[1, 2, 3, 4].map(idx => (
                        <div key={idx} style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '10px 5px', borderRadius: '6px', textAlign: 'center', fontFamily: 'monospace', fontSize: '1rem', fontWeight: 'bold', letterSpacing: '1px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                          ••••••••
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </>)}

    {toastMsg && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', backgroundColor: toastMsg.type === 'success' ? 'var(--success)' : 'var(--error)', color: 'white', padding: '15px 25px', borderRadius: '8px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} className="fade-in">
          {toastMsg.type === 'success' ? '✅' : '❌'} {toastMsg.text}
        </div>
      )}
    </main>
  );
}
