'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Login / Register', href: '/access' },
    { name: 'Anonymous Report', href: '/anonymous' },
    { name: 'User Dashboard', href: '/user/dashboard' },
    { name: 'Volunteer Dashboard', href: '/volunteer/dashboard' },
    { name: 'Admin Dashboard', href: '/admin' },
  ];

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
        padding: '0 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Link href="/" onClick={closeMenu} style={{ textDecoration: 'none' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '22px', height: '22px', background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)', borderRadius: '4px' }}></div>
            HelpHub
          </div>
        </Link>
        
        {/* Hamburger Icon */}
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
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} onClick={closeMenu} style={{ textDecoration: 'none' }}>
                <div style={{
                  fontSize: '1.1rem',
                  color: isActive ? '#38bdf8' : '#e2e8f0',
                  fontWeight: isActive ? 600 : 400,
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'color 0.2s ease'
                }}>
                  {link.name}
                </div>
              </Link>
            )
          })}
        </div>
      )}
      
      {/* Spacer to prevent content from going under the fixed header */}
      <div style={{ height: '60px' }}></div>
    </>
  );
}
