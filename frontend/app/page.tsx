'use client';

import { useState } from 'react';
import { useLanguage } from './context/LanguageContext';

export default function Home() {
  const { t, language, setLanguage } = useLanguage();
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);

  return (
    <main style={{ 
      position: 'relative',
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center',
      backgroundColor: '#0b1120', /* Very deep dark blue/black */
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif"
    }}>
      
      {/* Top Left Gradient Glow */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%', width: '800px', height: '800px',
        background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, rgba(11,17,32,0) 60%)',
        borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none'
      }} />

      {/* Top Right Language Selector */}
      <div style={{ position: 'absolute', top: '2rem', right: '2rem', zIndex: 20 }}>
        <select 
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value as any);
            setHasSelectedLanguage(true);
          }}
          style={{ 
            padding: '8px 12px', 
            borderRadius: '8px', 
            background: 'rgba(255, 255, 255, 0.1)', 
            color: '#fff', 
            border: '1px solid rgba(255, 255, 255, 0.2)',
            outline: 'none',
            backdropFilter: 'blur(10px)',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <option value="en" style={{ color: 'black' }}>English</option>
          <option value="te" style={{ color: 'black' }}>తెలుగు (Telugu)</option>
          <option value="hi" style={{ color: 'black' }}>हिंदी (Hindi)</option>
          <option value="ta" style={{ color: 'black' }}>தமிழ் (Tamil)</option>
        </select>
      </div>

      {/* Main Container */}
      <div className="fade-in" style={{ 
        position: 'relative',
        zIndex: 10,
        maxWidth: '1000px', 
        width: '90%',
        margin: '0 auto',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        
        {/* Header Section */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#94a3b8', marginBottom: '10px' }}>{t('helphub')}</div>
          <h1 style={{ 
            fontSize: 'clamp(3rem, 8vw, 5.5rem)', 
            fontWeight: 900, 
            color: '#f8fafc',
            lineHeight: '1.2',
            letterSpacing: '-1.5px',
            marginBottom: '10px'
          }}>
            {t('hero_title_1')} <br className="mobile-break" />
            <span style={{
              background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {t('hero_title_2')}
            </span>
          </h1>
          <p style={{ 
            fontSize: 'clamp(1rem, 3vw, 1.25rem)', 
            color: '#94a3b8', 
            fontWeight: 400,
            maxWidth: '650px',
            lineHeight: '1.6',
            marginTop: '1.5rem'
          }}>
            {t('hero_subtitle')}
          </p>
        </div>

        {/* Call to Action Buttons */}
        <div style={{ 
          marginTop: '2rem', 
          display: 'flex', 
          gap: '1rem', 
          flexWrap: 'wrap' 
        }}>
          {/* Primary Button */}
          <a href="/access" style={{ 
            display: 'inline-flex', 
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px 32px', 
            fontSize: '1.1rem', 
            fontWeight: 600,
            color: '#ffffff',
            background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)',
            borderRadius: '8px', 
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(56, 189, 248, 0.3)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            minWidth: '200px'
          }}
          onClick={(e) => {
            if (!hasSelectedLanguage) {
              e.preventDefault();
              setShowLanguagePopup(true);
            }
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 25px rgba(56, 189, 248, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(56, 189, 248, 0.3)';
          }}>
             {t('get_started')} →
          </a>
        </div>
      </div>

      {/* Custom Language Popup Modal */}
      {showLanguagePopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: '#1e293b', padding: '2rem', borderRadius: '12px',
            maxWidth: '400px', width: '90%', textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ color: '#f8fafc', marginBottom: '1rem', fontSize: '1.25rem' }}>Language Selection Required</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.5', marginBottom: '2rem' }}>
              Please select your preferred language. If no selection is made, English will be set as the default.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setShowLanguagePopup(false)} style={{
                padding: '10px 20px', borderRadius: '8px', background: 'transparent', 
                border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer'
              }}>
                Cancel
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('helphub_lang', 'en');
                  setLanguage('en');
                  setHasSelectedLanguage(true);
                  setShowLanguagePopup(false);
                  window.location.href = '/access';
                }} 
                style={{
                  padding: '10px 20px', borderRadius: '8px', background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)', 
                  border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                Proceed with English
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        body { margin: 0; }
        @media (min-width: 768px) {
           .mobile-break { display: none; }
        }
      `}} />
    </main>
  );
}
