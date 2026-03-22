'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Register Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW error:', err));
      }
      
      // Detect if user is on iOS and NOT already in standalone (app) mode
      const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      
      if (isIosDevice && !isStandalone) {
        // Show our custom iOS instruction modal right away
        setIsIOS(true);
        setShowInstallBtn(true);
      }
    }
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBtn(false);
      }
      setDeferredPrompt(null);
    }
  };

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  // Default links
  let navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Login / Register', href: '/access' },
    { name: 'Anonymous Report', href: '/anonymous' },
  ];

  if (pathname.startsWith('/user/dashboard')) {
    navLinks = [
      { name: 'Home', href: '/' },
      { name: 'Report an Issue', href: '#report' },
      { name: 'My Reports', href: '#my_reports' },
      { name: 'My Profile', href: '#profile' },
      { name: '🚨 Emergency Call', href: 'tel:112' },
      { name: 'Logout', href: '#logout' }
    ];
  } else if (pathname.startsWith('/volunteer/dashboard')) {
    navLinks = [
      { name: 'Home', href: '/' },
      { name: 'Assigned Issues', href: '#assigned' },
      { name: 'Nearby Unassigned', href: '#nearby' },
      { name: 'Requested Assignments', href: '#requests' },
      { name: 'My Profile', href: '#profile' },
      { name: 'Logout', href: '#logout' }
    ];
  } else if (pathname.startsWith('/admin')) {
    navLinks = [
      { name: 'Home', href: '/' },
      { name: 'Issue Management', href: '#reports' },
      { name: 'Volunteers', href: '#volunteers' },
      { name: 'Assignment Requests', href: '#requests' },
      { name: 'Logout', href: '#logout' }
    ];
  }

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    if (href === '#logout') {
      e.preventDefault();
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      localStorage.removeItem('admin_access');
      window.location.href = '/';
    }
    closeMenu();
  };

  return (
    <>
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '60px',
        backgroundColor: 'rgba(11, 17, 32, 0.95)',
        backdropFilter: 'blur(10px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 15px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Link href="/" onClick={closeMenu} style={{ textDecoration: 'none' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)', borderRadius: '4px' }}></div>
            HelpHub
          </div>
        </Link>
        
        {/* Hamburger Icon - Only show on dashboards */}
        {(pathname.startsWith('/user/dashboard') || pathname.startsWith('/volunteer/dashboard') || pathname.startsWith('/admin')) && (
          <button onClick={toggleMenu} style={{
            background: 'none', border: 'none', cursor: 'pointer', outline: 'none', color: '#f8fafc', padding: '5px'
          }} aria-label="Toggle Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>
        )}
      </header>

      {/* Mobile Menu Drawer */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: '60px',
          left: 0,
          width: '100%',
          height: 'calc(100vh - 60px)',
          backgroundColor: '#0f172a',
          zIndex: 49,
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem',
          gap: '1.5rem',
          overflowY: 'auto'
        }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (typeof window !== 'undefined' && window.location.hash === link.href);
            return (
              <a key={link.name} href={link.href} onClick={(e) => handleLinkClick(e, link.href)} style={{ textDecoration: 'none' }}>
                <div style={{
                  fontSize: '1.1rem',
                  color: isActive ? '#38bdf8' : '#e2e8f0',
                  fontWeight: isActive ? 600 : 400,
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'color 0.2s ease',
                  ...(link.name.includes('Logout') ? { color: '#ef4444' } : {})
                }}>
                  {link.name}
                </div>
              </a>
            )
          })}
        </div>
      )}

      {/* Custom Install App Pop-Up Overlay */}
      {showInstallBtn && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--surface)',
          padding: '20px',
          borderRadius: '15px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
          zIndex: 99999,
          width: '90%',
          maxWidth: '400px',
          border: '1px solid rgba(56, 189, 248, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '15px',
          animation: 'slideUp 0.5s ease-out'
        }}>
          <div style={{ textAlign: 'center' }}>
             <h3 style={{ margin: '0 0 8px 0', color: '#38bdf8', fontSize: '1.3rem' }}>📱 Install HelpHub!</h3>
             
             {isIOS ? (
               <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                 To install this app on your iPhone: <br/>
                 Tap the <strong>Share</strong> icon at the bottom of Safari, then tap <strong>"Add to Home Screen" ➕</strong>.
               </p>
             ) : (
               <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>Install our application to your device for a faster, full-screen native experience!</p>
             )}
          </div>
          
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
             <button onClick={() => setShowInstallBtn(false)} style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
             {!isIOS && (
               <button onClick={handleInstallClick} style={{ flex: 2, padding: '12px', backgroundColor: '#38bdf8', border: 'none', color: '#0f172a', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.05rem' }}>Install Now</button>
             )}
          </div>
        </div>
      )}
      
      {/* Spacer to prevent content from going under the fixed header */}
      <div style={{ height: '60px' }}></div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { transform: translate(-50%, 150%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}} />
    </>
  );
}
