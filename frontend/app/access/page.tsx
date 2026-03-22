'use client';

import { useLanguage } from '../context/LanguageContext';

export default function AccessOptions() {
  const { t } = useLanguage();

  return (
    <main className="fade-in" style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="glass-card" style={{ maxWidth: '800px', width: '100%' }}>
        
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-main)', fontSize: '1.8rem', fontWeight: 600 }}>
          {t('helphub')} - Login
        </h2>

        {/* Buttons Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <a href="/user" className="btn-primary" style={{ display: 'block', width: '100%', maxWidth: '300px', textAlign: 'center', padding: '1rem', fontSize: '1rem', backgroundColor: 'var(--primary)' }}>
            👤 {t('user_access')}
          </a>
          <a href="/volunteer" className="btn-primary" style={{ display: 'block', width: '100%', maxWidth: '300px', textAlign: 'center', padding: '1rem', fontSize: '1rem', backgroundColor: 'var(--secondary)' }}>
            🤝 {t('volunteer_access')}
          </a>
          <a href="/admin" className="btn-primary" style={{ display: 'block', width: '100%', maxWidth: '300px', textAlign: 'center', padding: '1rem', fontSize: '1rem', backgroundColor: 'var(--text-main)' }}>
            🏛️ {t('admin_access')}
          </a>
          <a href="/anonymous" className="btn-primary" style={{ display: 'block', width: '100%', maxWidth: '300px', textAlign: 'center', padding: '1rem', fontSize: '1rem', backgroundColor: '#95a5a6' }}>
            🕵️ {t('anonymous_report')}
          </a>
        </div>
      </div>
    </main>
  );
}
