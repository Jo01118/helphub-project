'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { requestFormData } from '../utils/api';
import { searchLocationCoords } from '../utils/geocoding';

export default function AnonymousReport() {
  const { t } = useLanguage();
  
  // Geolocation
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locName, setLocName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  // Form Fields
  const [photo, setPhoto] = useState<File | null>(null);
  const [manualText, setManualText] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [toastMsg, setToastMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  const showToast = (text: string, type: 'success'|'error' = 'error') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  useEffect(() => {

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
  }, []);

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
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
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

  const handleSearchLocation = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    const result = await searchLocationCoords(searchQuery);
    setIsSearching(false);
    
    if (result) {
      setLocation({ lat: result.lat, lng: result.lng });
      setLocName(result.name || searchQuery);
      setSearchQuery('');
    } else {
      showToast("Could not find that location. Please try adding more details.");
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLocationConfirmed || !location) {
      showToast("Please search and confirm a location before submitting.");
      return;
    }
    if (!manualText) {
      showToast("Please provide a description of the issue.");
      return;
    }

    try {
      const formData = new FormData();
      // Anonymous reports default to 0,0 since we are removing strict coordinates
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
      
      const combinedText = `[Voice]: ${voiceText}\n\n[Text]: ${manualText}\n[Location Info]: ${locName}`;
      formData.append('text', combinedText);
      formData.append('language', 'en'); 

      if (photo) formData.append('photo', photo);
      if (contactInfo) formData.append('contact_info', contactInfo);

      await requestFormData('/reports/', formData, 'POST');
      setSubmitted(true);
    } catch (error: any) {
      console.error(error);
      showToast(`Failed to submit report: ${error.message}`);
    }
  };

  if (submitted) {
    return (
      <main className="fade-in" style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
        <div className="glass-card" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--success)', marginBottom: '1rem' }}>✅ Report Submitted Successfully!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Thank you for helping the community. Your report has been routed to the relevant authorities.</p>
          <a href="/" className="btn-primary" style={{ display: 'inline-block' }}>Return Home</a>
        </div>
      </main>
    );
  }

  return (
    <main className="fade-in" style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      <div className="glass-card" style={{ maxWidth: '800px', width: '100%', borderTop: '5px solid #95a5a6' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          🕵️ {t('anonymous_report')}
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
          No login required for anonymous reporting.<br/>
          If you wish to receive updates, you may optionally provide your contact details.
        </p>

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
            onChange={(e) => setManualText(e.target.value)} required 
          />

          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, marginTop: '1rem' }}>📧 Optional Contact (Email/Phone)</label>
          <input 
            type="text" 
            placeholder="Enter if you want updates" 
            value={contactInfo} 
            onChange={(e) => setContactInfo(e.target.value)} 
          />

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1.5rem', padding: '15px', backgroundColor: '#95a5a6', boxShadow: 'none' }} disabled={!isLocationConfirmed}>
            {t('submit')}
          </button>
          {!isLocationConfirmed && <p style={{ color: 'var(--error)', fontSize: '0.9rem', textAlign: 'center', marginTop: '10px' }}>Please confirm the incident location on the map.</p>}
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <a href="/">{t('back')}</a>
        </div>
      </div>

      {toastMsg && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', backgroundColor: toastMsg.type === 'success' ? 'var(--success)' : 'var(--error)', color: 'white', padding: '15px 25px', borderRadius: '8px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} className="fade-in">
          {toastMsg.type === 'success' ? '✅' : '❌'} {toastMsg.text}
        </div>
      )}
    </main>
  );
}
