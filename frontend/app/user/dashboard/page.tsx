'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { request, requestFormData } from '../../utils/api';
import { getLocationName, searchLocationCoords } from '../../utils/geocoding';

export default function UserDashboard() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'report' | 'my_reports' | 'profile'>('report');
  
  // Profile State
  const [userData, setUserData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  
  // Geolocation
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locName, setLocName] = useState<string>('');
  const [locError, setLocError] = useState<string>('');
  const [showOverride, setShowOverride] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBlobState, setAudioBlobState] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  // Form Fields
  const [photo, setPhoto] = useState<File | null>(null);
  const [manualText, setManualText] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  // New Field for Admin Communication
  const [contactInfo, setContactInfo] = useState('');

  // Database Reports
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    // Check if token exists, else redirect
    if (!localStorage.getItem('access')) {
      window.location.href = '/user';
      return;
    }

    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'report' || hash === 'my_reports' || hash === 'profile') {
        setActiveTab(hash as any);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);


    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; 
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
           setVoiceText(prev => prev + ' ' + finalTranscript);
        }
      };
      recognitionRef.current = recognition;
    }

    fetchProfile();
    fetchMyReports();
    
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await request('/auth/me/');
      setUserData(data);
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const fetchMyReports = async () => {
    setLoadingReports(true);
    try {
      // The backend API handles filtering by user due to authentication context!
      const data = await request('/reports/');
      // We will enhance the locations for older reports on the fly
      const enhancedData = await Promise.all(data.map(async (r: any) => {
         const name = await getLocationName(r.latitude, r.longitude);
         return { ...r, location_name: name };
      }));
      setReports(enhancedData);
    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
      if (err.message.includes('token') || err.message.includes('credentials')) {
        window.location.href = '/user'; // Token likely expired
      }
    } finally {
      setLoadingReports(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    const result = await searchLocationCoords(searchQuery);
    setIsSearching(false);
    
    if (result) {
      setLocation({ lat: result.lat, lng: result.lng });
      setLocName(result.name || searchQuery);
      setShowOverride(false);
      setSearchQuery('');
    } else {
      alert("Could not find that location. Please try adding more details (e.g. 'Nagari, Andhra Pradesh').");
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlobState(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setContactInfo('');
      if (recognitionRef.current) recognitionRef.current.start();
      
    } catch (err) {
      console.error('Microphone access denied', err);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) return;

    setSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
      
      // Combine manual text and voice text for the backend
      const combinedText = `[Voice]: ${voiceText}\n\n[Text]: ${manualText}`;
      formData.append('text', combinedText);
      formData.append('language', language);

      if (photo) {
        formData.append('photo', photo);
      }
      if (contactInfo) {
        formData.append('contact_info', contactInfo);
      }
      if (audioBlobState) {
        formData.append('original_audio', audioBlobState, 'voice_report.webm');
      }

      await requestFormData('/reports/', formData, 'POST');
      
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);
      
      // Reset form
      setManualText('');
      setVoiceText('');
      setAudioURL(null);
      setAudioBlobState(null);
      setPhoto(null);
      setLocation(null);
      setIsLocationConfirmed(false);
      setSearchQuery('');
      setContactInfo('');
      
      // Refresh reports
      await fetchMyReports();
      setActiveTab('my_reports');

    } catch (error: any) {
      console.error(error);
      setSubmitError(`Failed to submit: ${error.message}`);
      setTimeout(() => setSubmitError(''), 5000);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
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

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--surface)', padding: '1rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 600 }}>User Dashboard</h1>
      </header>
      {/* Tabs removed for global navigation */}

      {/* Content */}
      <div style={{ padding: '2rem', flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '800px' }}>
          
          {activeTab === 'report' && (
            <div className="glass-card fade-in">
              <h2 style={{ marginBottom: '1.5rem' }}>{t('report_issue')}</h2>
                          <div style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', padding: '15px', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--primary)' }}>
                {isLocationConfirmed ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 'bold', display: 'block', margin: '5px 0' }}>
                        📍 Confirmed: {locName}
                      </span>
                      <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>
                        Coordinates: {location?.lat?.toFixed(6)}, {location?.lng?.toFixed(6)}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setIsLocationConfirmed(false)} 
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
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        placeholder="Type city or area (e.g. Tirupati, Andhra Pradesh)"
                        style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}
                      />
                      <button 
                        type="button" 
                        onClick={handleSearchLocation} 
                        className="btn-primary"
                        disabled={isSearching}
                        style={{ padding: '0 20px', borderRadius: '6px' }}
                      >
                        {isSearching ? 'Searching...' : 'Search'}
                      </button>
                    </div>

                    {location ? (
                       <div>
                         <span style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 'bold', display: 'block', margin: '5px 0' }}>
                           Selected: {locName}
                         </span>
                         <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>
                           Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                         </span>
                         
                         <iframe 
                           width="100%" 
                           height="250" 
                           style={{ border: '2px solid var(--border)', borderRadius: '8px', marginTop: '15px', marginBottom: '15px' }} 
                           src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng-0.02}%2C${location.lat-0.02}%2C${location.lng+0.02}%2C${location.lat+0.02}&layer=mapnik&marker=${location.lat}%2C${location.lng}`}
                         ></iframe>

                         <button 
                           type="button"
                           className="btn-primary"
                           style={{ width: '100%', backgroundColor: 'var(--success)', padding: '12px', fontSize: '1rem' }}
                           onClick={() => setIsLocationConfirmed(true)}
                         >
                           ✅ Confirm This Location
                         </button>
                       </div>
                     ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          Please search for a location to view the map and verify your coordinates before submitting.
                        </span>
                     )}
                  </>
                )}
               </div>

              <form onSubmit={handleSubmitReport}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>📸 Upload Photo</label>
                <input type="file" accept="image/*" onChange={(e) => e.target.files && setPhoto(e.target.files[0])} />

                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, marginTop: '1rem' }}>🎤 Voice Input</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', alignItems: 'center' }}>
                  {!isRecording ? (
                    <button type="button" onClick={handleStartRecording} style={{ padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white' }}>Start Recording</button>
                  ) : (
                    <button type="button" onClick={handleStopRecording} style={{ padding: '10px 20px', backgroundColor: 'var(--error)', color: 'white' }}>Stop Recording</button>
                  )}
                  {isRecording && <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>Recording...</span>}
                </div>
                
                {audioURL && (
                  <div style={{ marginBottom: '1rem' }}>
                    <audio src={audioURL} controls style={{ width: '100%' }} />
                  </div>
                )}
                
                {voiceText && (
                  <div style={{ marginBottom: '1rem', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <strong>Converted Text:</strong> <p>{voiceText}</p>
                  </div>
                )}

                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, marginTop: '1rem' }}>⌨️ Manual Text Input</label>
                <textarea 
                  rows={4} 
                  placeholder="Describe the issue in detail..." 
                  value={manualText} 
                  onChange={(e) => setManualText(e.target.value)} required={!voiceText} 
                />

                <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', backgroundColor: 'var(--surface)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Leave Contact Info (Optional)</label>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>If there are no nearby volunteers, an admin can contact you regarding this issue.</p>
                  <input type="text" placeholder="Email or Phone Number" value={contactInfo} onChange={e => setContactInfo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border)' }} />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1.5rem', padding: '15px' }} disabled={!isLocationConfirmed || submitLoading}>
                  {submitLoading ? 'Saving...' : t('submit')}
                </button>
                {!isLocationConfirmed && <p style={{ color: 'var(--error)', fontSize: '0.9rem', textAlign: 'center', marginTop: '10px' }}>Please strictly confirm your location above before submitting a report.</p>}
              </form>
            </div>
          )}

          {activeTab === 'my_reports' && (
            <div className="fade-in">
              <h2 style={{ marginBottom: '1.5rem' }}>{t('my_reports')}</h2>
              {loadingReports ? (
                 <div style={{ textAlign: 'center', color: 'var(--primary)' }}>Loading your reports securely from the server...</div>
              ) : reports.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No reports submitted yet.
                </div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="glass-card" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Report #{report.id}</span>
                      <span style={{ backgroundColor: 'var(--secondary)', color: 'var(--text-main)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {report.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Date: {new Date(report.created_at).toLocaleString()}</p>
                    
                    {report.admin_message && (
                      <div style={{ backgroundColor: 'rgba(255, 193, 7, 0.15)', borderLeft: '4px solid #f1c40f', padding: '10px 15px', marginBottom: '15px', borderRadius: '4px' }}>
                        <strong style={{ color: '#d35400' }}>Admin Reply:</strong>
                        <p style={{ margin: '5px 0 0 0', color: 'var(--text-main)', fontSize: '0.95rem' }}>{report.admin_message}</p>
                      </div>
                    )}

                    {(() => {
                      const textParts = report.text ? report.text.split('[Text]:') : ['', ''];
                      const voicePart = textParts[0];
                      const manualPart = textParts.length > 1 ? '[Text]:' + textParts[1] : '';

                      return (
                        <>
                          {voicePart.trim() && (
                            <div style={{ whiteSpace: 'pre-wrap', marginBottom: '10px' }}>
                              {voicePart.trim()}
                            </div>
                          )}

                          {report.original_audio && (
                            <div style={{ marginBottom: '15px' }}>
                              <audio src={report.original_audio.startsWith('http') ? report.original_audio : `http://127.0.0.1:8000${report.original_audio}`} controls style={{ width: '100%' }} />
                            </div>
                          )}

                          {manualPart.trim() && (
                            <div style={{ whiteSpace: 'pre-wrap', marginBottom: '10px' }}>
                              {manualPart.trim()}
                            </div>
                          )}
                        </>
                      );
                    })()}
                    
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.03)', padding: '10px', borderRadius: '8px', marginTop: '10px' }}>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>📍 {report.location_name}</strong>
                      <br/>
                      <span style={{ fontSize: '0.85rem' }}>Lat: {report.latitude?.toFixed(6)}, Lng: {report.longitude?.toFixed(6)}</span>
                    </div>
                    
                    {report.photo && (
                       <img src={report.photo.startsWith('http') ? report.photo : `http://127.0.0.1:8000${report.photo}`} alt="Report Photo" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '8px', marginTop: '15px' }} />
                    )}

                    {report.resolved_proof && (
                      <div style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '15px', borderRadius: '8px', marginTop: '15px', border: '1px solid var(--success)' }}>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--success)' }}>✅ Issue Resolved - Proof Provided:</strong>
                        {report.resolved_proof.match(/\.(mp4|webm|ogg)$/i) ? (
                          <video src={report.resolved_proof.startsWith('http') ? report.resolved_proof : `http://127.0.0.1:8000${report.resolved_proof}`} controls style={{ width: '100%', maxHeight: '400px', marginTop: '10px', borderRadius: '8px' }} />
                        ) : (
                          <img src={report.resolved_proof.startsWith('http') ? report.resolved_proof : `http://127.0.0.1:8000${report.resolved_proof}`} alt="Resolution Proof" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', marginTop: '10px', borderRadius: '8px' }} />
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
            
            {activeTab === 'profile' && userData && (
              <div className="glass-card fade-in">
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>My Profile</h2>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  <p style={{ margin: '0 0 5px 0', color: 'var(--text-muted)' }}>Account ID</p>
                  <strong style={{ fontSize: '1.2rem' }}>{userData.id}</strong>
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
                  <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '15px', fontSize: '1.1rem' }} disabled={profileLoading}>
                    {profileLoading ? 'Saving Changes...' : 'Save Profile Details'}
                  </button>
                </form>
              </div>
            )}
            
          </div>
      </div>

      {submitSuccess && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', backgroundColor: 'var(--success)', color: 'white', padding: '15px 25px', borderRadius: '8px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} className="fade-in">
          ✅ Issue submitted successfully
        </div>
      )}
      {submitError && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', backgroundColor: 'var(--error)', color: 'white', padding: '15px 25px', borderRadius: '8px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} className="fade-in">
          ❌ {submitError}
        </div>
      )}
    </main>
  );
}
