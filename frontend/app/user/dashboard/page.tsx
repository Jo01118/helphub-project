'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { request, requestFormData, BASE_URL } from '../../utils/api';
import { getLocationName, searchLocationCoords } from '../../utils/geocoding';
import { getIssueSuggestions } from '../../utils/aiSuggestions';

export default function UserDashboard() {
  const { t, language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'report' | 'my_reports' | 'profile'>('report');
  
  // Profile State
  const [userData, setUserData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  
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
  const [category, setCategory] = useState('');
  const [issueType, setIssueType] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCategory(val);
    // Clear issueType when user starts typing again so suggestions reappear
    setIssueType('');
    if (val.trim()) {
      setSuggestions(getIssueSuggestions(val));
    } else {
      setSuggestions([]);
    }
  };

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
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'report' || hash === 'my_reports' || hash === 'profile') {
        setActiveTab(hash as any);
      }
    };

    try {
      // Check if token exists, else redirect
      if (!localStorage.getItem('access')) {
        window.location.href = '/user';
        return;
      }

      handleHash();
      window.addEventListener('hashchange', handleHash);

      // Initialize Speech Recognition
      try {
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
      } catch (speechErr) {
        console.warn('Speech recognition not supported or blocked:', speechErr);
      }
    } catch (globalErr) {
      console.error('Initialization error:', globalErr);
    }

    setMounted(true);
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
      // We will use the location_name stored in the database for speed
      setReports(data);
    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
      if (err.message.includes('token') || err.message.includes('credentials') || err.message.includes('Time out')) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('userRole');
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
      setSubmitError("Could not find that location. Please try adding more details (e.g. 'Nagari, Andhra Pradesh').");
      setTimeout(() => setSubmitError(''), 5000);
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
        const type = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type });
        setAudioBlobState(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setContactInfo('');
      try {
        if (recognitionRef.current) recognitionRef.current.start();
      } catch (speechErr) { console.error('Speech recognition start failed', speechErr); }
      
    } catch (err: any) {
      console.error('Microphone access denied', err);
      setSubmitError('Microphone access failed: ' + (err.message || 'Permission denied. Please check your browser settings.'));
      setTimeout(() => setSubmitError(''), 6000);
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
      const combinedText = `[Category]: ${category || 'General'}\n[Issue]: ${issueType || 'Not specified'}\n[Voice]: ${voiceText}\n\n[Text]: ${manualText}`;
      formData.append('text', combinedText);
      formData.append('location_name', locName);
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
      setCategory('');
      setIssueType('');
      setSuggestions([]);
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

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--surface)', padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ color: 'var(--primary)', fontSize: '1.25rem', fontWeight: 600 }}>{mounted ? t('user_dashboard') : 'User Dashboard'}</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', border: '1px solid var(--error)', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
          {t('logout')}
        </button>
      </header>
      {/* Tabs removed for global navigation */}

      {/* Content */}
      <div style={{ padding: '1rem', flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '800px' }}>
          {!mounted ? (
            <div style={{ textAlign: 'center', color: 'var(--primary)', marginTop: '2rem' }}>Loading Dashboard...</div>
          ) : (
            <>
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
                    <strong style={{ display: 'block', marginBottom: '10px' }}>{t('search_location')}</strong> 
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                      <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        placeholder={t('search_placeholder')}
                        style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}
                      />
                      <button 
                        type="button" 
                        onClick={handleSearchLocation} 
                        className="btn-primary"
                        disabled={isSearching}
                        style={{ padding: '0 20px', borderRadius: '6px' }}
                      >
                        {isSearching ? t('searching') : t('search_button')}
                      </button>
                    </div>

                    {location ? (
                       <div>
                         <span style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 'bold', display: 'block', margin: '5px 0' }}>
                           {t('selected_issue')}: {locName}
                         </span>
                         <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>
                           {t('confirmed_coords')}: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
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
                           {t('confirm_location_button')}
                         </button>
                       </div>
                     ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          {t('search_help_text')}
                        </span>
                     )}
                  </>
                )}
               </div>

              <form onSubmit={handleSubmitReport}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('category')}</label>
                <input 
                  type="text" 
                  value={category} 
                  onChange={handleCategoryChange} 
                  placeholder={t('category_placeholder')}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', marginBottom: '10px' }}
                />
                
                {suggestions.length > 0 && !issueType && (
                  <div style={{ marginBottom: '1rem', padding: '10px', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px dashed var(--primary)' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('smart_suggestions')}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {suggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setIssueType(sug)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: issueType === sug ? 'var(--primary)' : 'rgba(56, 189, 248, 0.1)',
                            color: issueType === sug ? '#fff' : 'var(--primary)',
                            border: '1px solid var(--primary)',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                          }}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {issueType && (
                   <div style={{ marginBottom: '1rem', color: 'var(--success)', fontWeight: 'bold' }}>
                     Selected Issue: {issueType}
                   </div>
                )}

                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, marginTop: '1rem' }}>{t('upload_photo')}</label>
                <input type="file" accept="image/*" onChange={(e) => e.target.files && setPhoto(e.target.files[0])} style={{ marginBottom: '1rem' }} />

                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, marginTop: '1rem' }}>{t('voice_input')}</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', alignItems: 'center' }}>
                  {!isRecording ? (
                    <button type="button" onClick={handleStartRecording} style={{ padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white' }}>{t('start_recording')}</button>
                  ) : (
                    <button type="button" onClick={handleStopRecording} style={{ padding: '10px 20px', backgroundColor: 'var(--error)', color: 'white' }}>{t('stop_recording')}</button>
                  )}
                  {isRecording && <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>{t('recording_status')}</span>}
                </div>
                
                {audioURL && (
                  <div style={{ marginBottom: '1rem' }}>
                    <audio src={audioURL} controls style={{ width: '100%' }} />
                  </div>
                )}
                
                {voiceText && (
                  <div style={{ marginBottom: '1rem', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <strong>{t('converted_text')}:</strong> <p>{voiceText}</p>
                  </div>
                )}

                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, marginTop: '1rem' }}>{t('manual_input')}</label>
                <textarea 
                  rows={4} 
                  placeholder={t('manual_input_placeholder')} 
                  value={manualText} 
                  onChange={(e) => setManualText(e.target.value)} required={!voiceText} 
                />

                <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', backgroundColor: 'var(--surface)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>{t('contact_info_label')}</label>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{t('contact_info_help')}</p>
                  <input type="text" placeholder={t('contact_info_placeholder')} value={contactInfo} onChange={e => setContactInfo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border)' }} />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1.5rem', padding: '15px' }} disabled={!isLocationConfirmed || submitLoading}>
                  {submitLoading ? t('saving') : t('submit')}
                </button>
                {!isLocationConfirmed && <p style={{ color: 'var(--error)', fontSize: '0.9rem', textAlign: 'center', marginTop: '10px' }}>{t('strict_location_warning')}</p>}
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
                  {t('no_reports_yet') || 'No reports submitted yet.'}
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
                              <audio src={report.original_audio.startsWith('http') || report.original_audio.startsWith('data:') ? report.original_audio : `${BASE_URL}${report.original_audio}`} controls style={{ width: '100%' }} />
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
                    
                    <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.05)', padding: '10px', borderRadius: '8px', marginTop: '10px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>📍 {report.location_name || 'Geocoding...'}</strong>
                      {!report.location_name && (
                         <LocationEnhancer report={report} onResolved={(name) => {
                            setReports(prev => prev.map(r => r.id === report.id ? {...r, location_name: name} : r));
                         }} />
                      )}
                      <br/>
                      <span style={{ fontSize: '0.85rem' }}>Lat: {report.latitude?.toFixed(6)}, Lng: {report.longitude?.toFixed(6)}</span>
                    </div>
                    
                    {report.photo && (
                       <img src={report.photo.startsWith('http') || report.photo.startsWith('data:') ? report.photo : `${BASE_URL}${report.photo}`} alt="Report Photo" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '8px', marginTop: '15px' }} />
                    )}

                    {report.resolved_proof && (
                      <div style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '15px', borderRadius: '8px', marginTop: '15px', border: '1px solid var(--success)' }}>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--success)' }}>✅ Issue Resolved - Proof Provided:</strong>
                        {report.resolved_proof.match(/\.(mp4|webm|ogg)$/i) ? (
                          <video src={report.resolved_proof.startsWith('http') || report.resolved_proof.startsWith('data:') ? report.resolved_proof : `${BASE_URL}${report.resolved_proof}`} controls style={{ width: '100%', maxHeight: '400px', marginTop: '10px', borderRadius: '8px' }} />
                        ) : (
                          <img src={report.resolved_proof.startsWith('http') || report.resolved_proof.startsWith('data:') ? report.resolved_proof : `${BASE_URL}${report.resolved_proof}`} alt="Resolution Proof" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', marginTop: '10px', borderRadius: '8px' }} />
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
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>{t('my_profile') || 'My Profile'}</h2>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  <p style={{ margin: '0 0 5px 0', color: 'var(--text-muted)' }}>{t('account_id')}</p>
                  <strong style={{ fontSize: '1.2rem' }}>{userData.id}</strong>
                </div>
                
                {profileMsg.text && (
                  <div style={{ padding: '10px', borderRadius: '8px', marginBottom: '1rem', backgroundColor: profileMsg.type === 'success' ? 'var(--success)' : 'var(--error)', color: profileMsg.type === 'success' ? 'black' : 'white', textAlign: 'center', fontWeight: 'bold' }}>
                    {profileMsg.text}
                  </div>
                )}
                
                <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('username') || 'Username'}</label>
                    <input type="text" value={userData.username || ''} onChange={e => setUserData({...userData, username: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('name')}</label>
                    <input type="text" value={userData.first_name || ''} onChange={e => setUserData({...userData, first_name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('phone')}</label>
                      <input type="tel" value={userData.phone || ''} onChange={e => setUserData({...userData, phone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('age')}</label>
                      <input type="number" value={userData.age || ''} onChange={e => setUserData({...userData, age: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('email')}</label>
                    <input type="email" value={userData.email || ''} onChange={e => setUserData({...userData, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('city')}</label>
                    <input type="text" value={userData.city || ''} onChange={e => setUserData({...userData, city: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                  </div>
                  <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '15px', fontSize: '1.1rem' }} disabled={profileLoading}>
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
            </>
          )}
        </div>
      </div>

      {submitSuccess && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', backgroundColor: 'var(--success)', color: 'white', padding: '15px 25px', borderRadius: '8px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} className="fade-in">
          <div>✅ Issue submitted successfully</div>
          <div style={{ fontSize: '0.85rem', marginTop: '5px' }}>You will be notified if no volunteers are nearby.</div>
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

// Helper component to geocode old reports exactly once when they appear in the list
function LocationEnhancer({ report, onResolved }: { report: any, onResolved: (name: string) => void }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchName = async () => {
      if (report.location_name) return;
      setLoading(true);
      try {
        const name = await getLocationName(report.latitude, report.longitude);
        onResolved(name);
      } catch (err) {
        console.error("Enhancement failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchName();
  }, [report.id]);

  return loading ? <span style={{ fontSize: '0.75rem', opacity: 0.7 }}> (Resolving...)</span> : null;
}
