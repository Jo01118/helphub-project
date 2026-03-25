'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';

interface Message {
  id: number;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
}

export default function HelpChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I am HelpHub's automated assistant. You can ask me questions like 'I can't upload image', 'location not working', or 'how to report issue'. How can I help you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateBotResponse = (userInput: string): string => {
    const text = userInput.toLowerCase();

    // Keyword Detection
    if (text.includes('upload') && (text.includes('image') || text.includes('photo') || text.includes('picture'))) {
      return "To upload an image, click on the 'Upload Photo' button in the report form. Make sure the file format is a standard image like JPEG or PNG, and the file size isn't too large.";
    }

    if (text.includes('location') || text.includes('map') || text.includes('gps')) {
      return "If your live location isn't working, please ensure you've given location permissions to your browser. Alternatively, you can use the search bar in the report form to manually type your city or area, and confirm it on the map.";
    }

    if (text.includes('how to report') || text.includes('create report') || text.includes('submit issue')) {
      return "To report an issue, navigate to the Home page or User Dashboard and click 'Report an Issue'. Fill in the Category, select the Issue type, confirm your location on the map, provide a description, and finally click Submit.";
    }
    
    if (text.includes('anonymous')) {
      return "Yes, you can report an issue anonymously! Just go to the Home page and select 'Anonymous Report'. We won't require you to log in or leave your details, unless you want updates.";
    }

    if (text.includes('volunteer') || text.includes('help out')) {
      return "To become a volunteer, click 'Login / Register' from the menu and choose the 'Volunteer' registration option. Once approved, you can attend to nearby issues.";
    }

    if (text.includes('password') || text.includes('login') || text.includes('account')) {
      return "Having trouble logging in? You can use one of your generated Account Recovery Codes to log in if you forget your password. Look for them in your Profile section once you successfully log in.";
    }
    
    if (text.includes('change name') || text.includes('profile') || text.includes('edit details') || text.includes('update name') || text.includes('username') || text.includes('phone') || text.includes('email')) {
      return "To change your name or other personal details, navigate to the 'My Profile' tab in your Dashboard. Make your desired changes there and click 'Save Profile Details'.";
    }

    if (text.includes('admin') || text.includes('contact') || text.includes('support team') || text.includes('help desk') || text.includes('email') || text.includes('owner') || text.includes('volunteer')) {
      return "If you need to contact the admin, owners, or volunteers directly, please send an email to: helphubreporting.team@gmail.com";
    }

    if (text.includes('solve') || text.includes('how many days') || text.includes('time') || text.includes('when') || text.includes('resolve') || text.includes('take')) {
      return "Once you submit a report, it is routed to nearby volunteers and our administration team. Resolution times vary by issue severity and volunteer availability, but most standard issues are typically addressed within 2 to 4 business days. You can track your report's status in the 'My Reports' tab.";
    }

    if (text.includes('offline') || text.includes('no internet') || text.includes('without internet')) {
      return "Yes! HelpHub is designed as a Progressive Web App (PWA). You can install it on your mobile device or computer to access it easily. Please note that while the app itself can be opened offline, you will need an active internet connection to submit new reports or receive live updates.";
    }

    // Broad generic application fallback
    if (text.includes('app') || text.includes('issue') || text.includes('report') || text.includes('helphub') || text.includes('system') || text.includes('platform') || text.includes('error') || text.includes('bug')) {
       return "For any general application queries or issues regarding HelpHub, make sure you are logged in. You can explore the user dashboard to see your active reports. If the system is not working as expected, feel free to try reloading the page, or checking your geolocation permissions.";
    }

    // Default fallback (Out of scope)
    return "I'm sorry, I cannot answer queries that are not related to the HelpHub application. To contact the owners, admin, or volunteers regarding any other matter, please send an email to helphubreporting.team@gmail.com";
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate thinking delay between 2-5 secs
    const delay = Math.floor(Math.random() * 3000) + 2000;
    setTimeout(() => {
      const responseText = generateBotResponse(userMsg.text);
      const botMsg: Message = {
        id: Date.now() + 1,
        text: responseText,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, delay);
  };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', flexDirection: 'column' }}>
      <Navigation />
      
      <div style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center', marginTop: '60px' }}>
        <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', padding: 0, overflow: 'hidden' }}>
          
          <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderBottom: '1px solid var(--border)', textAlign: 'center', position: 'relative' }}>
            <button 
              onClick={() => router.back()} 
              style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', background: 'var(--primary)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold' }}
              title="Exit Chat"
            >
              ⬅️ Exit
            </button>
            <h2 style={{ color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              🤖 HelpHub Assistant
            </h2>
            <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chat with our AI bot to get help with common issues.</p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                width: '100%'
              }}>
                <div style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: msg.sender === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
                  backgroundColor: msg.sender === 'user' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                  border: msg.sender === 'bot' ? '1px solid var(--border)' : 'none',
                  color: msg.sender === 'user' ? '#fff' : 'var(--text-main)',
                  lineHeight: '1.5'
                }}>
                  {msg.text}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px', padding: '0 5px' }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            
            {isTyping && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                <div style={{ maxWidth: '75%', padding: '12px 16px', borderRadius: '16px 16px 16px 0', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                    <span className="typing-dot" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="typing-dot" style={{ animationDelay: '200ms' }}>.</span>
                    <span className="typing-dot" style={{ animationDelay: '400ms' }}>.</span>
                  </span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your question here (e.g. 'I can't upload image')..."
                style={{ flex: 1, padding: '15px', borderRadius: '30px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--text-main)', outline: 'none' }}
              />
              <button
                type="submit"
                style={{
                  padding: '0 25px',
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '30px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'background-color 0.2s'
                }}
                disabled={!inputText.trim()}
              >
                Send
              </button>
            </form>
          </div>

        </div>
      </div>
    <style jsx>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 150%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes blink {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }
        .typing-dot {
          animation: blink 1.4s infinite both;
          font-size: 1.5rem;
          line-height: 0.5;
        }
      `}</style>
    </main>
  );
}
