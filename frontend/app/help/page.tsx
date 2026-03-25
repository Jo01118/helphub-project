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

  // Hardcoded responses removed in favor of real AI.

  const handleSendMessage = async (e: React.FormEvent) => {
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

    try {
      // Call the new real AI Gemini endpoint
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg.text,
          // Pass context of the conversation so the model has memory (excluding the first system greeting)
          history: messages.length > 1 ? messages.slice(1) : []
        })
      });
      
      const data = await res.json();
      
      const botMsg: Message = {
        id: Date.now() + 1,
        text: data.text || "I didn't receive a response from the server.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Chat API error:", error);
      const botMsg: Message = {
        id: Date.now() + 1,
        text: "Sorry, I am having trouble connecting to my central brain. Please check your internet connection.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
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
