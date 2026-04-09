'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';

export default function AccessOptions() {
  const { t } = useLanguage();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Automatically bypass the gateway if a valid session state is cached in local storage
  useEffect(() => {
    const adminToken = localStorage.getItem('admin_access');
    const token = localStorage.getItem('access');
    const role = localStorage.getItem('userRole');

    if (adminToken) {
      router.push('/admin');
    } else if (token && role === 'VOLUNTEER') {
      router.push('/volunteer/dashboard');
    } else if (token && role === 'USER') {
      router.push('/user/dashboard');
    } else {
      setIsCheckingAuth(false);
    }
  }, []);

  if (isCheckingAuth) return null;

  return (
    <main className="fade-in" style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="glass-card" style={{ maxWidth: '800px', width: '100%' }}>
        
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-main)', fontSize: '1.8rem', fontWeight: 600 }}>
          {t('helphub')} - Login
        </h2>

        {/* Buttons Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <Link href="/user" className="btn-primary" style={{ display: 'block', width: '100%', maxWidth: '300px', textAlign: 'center', padding: '1rem', fontSize: '1rem', backgroundColor: 'var(--primary)' }}>
            👤 {t('user_access')}
          </Link>
          <Link href="/volunteer" className="btn-primary" style={{ display: 'block', width: '100%', maxWidth: '300px', textAlign: 'center', padding: '1rem', fontSize: '1rem', backgroundColor: 'var(--secondary)' }}>
            🤝 {t('volunteer_access')}
          </Link>
          <Link href="/admin" className="btn-primary" style={{ display: 'block', width: '100%', maxWidth: '300px', textAlign: 'center', padding: '1rem', fontSize: '1rem', backgroundColor: 'var(--text-main)' }}>
            🏛️ {t('admin_access')}
          </Link>
          <Link href="/anonymous" className="btn-primary" style={{ display: 'block', width: '100%', maxWidth: '300px', textAlign: 'center', padding: '1rem', fontSize: '1rem', backgroundColor: '#95a5a6' }}>
            🕵️ {t('anonymous_report')}
          </Link>
        </div>
      </div>
    </main>
  );
}
