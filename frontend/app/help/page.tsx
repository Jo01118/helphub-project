'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import { useLanguage } from '../context/LanguageContext';

interface Message {
  id: number;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
}

export default function HelpChat() {
  const router = useRouter();
  const { language, t } = useLanguage();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Localized FAQ Content Mapping for UI
  const faqData: any = {
    'en': {
      title: 'Support FAQ',
      subtitle: 'Common Questions & Offline Support',
      instruction: 'Here are the common questions and answers:',
      qa: [
        { q: "❓ I can't upload image?", a: "Answer: Check your internet connection and ensure the file size is under 5MB. You can also try taking a lower resolution photo." },
        { q: "❓ Location not working?", a: "Answer: Ensure your GPS/Location services are enabled on your device. On browsers, allow location permissions for HelpHub." },
        { q: "❓ How to report issue?", a: "Answer: Go to your Dashboard, click 'Report an Issue', select a location, add a category and description, and click Submit." },
        { q: "❓ How to register as volunteer?", a: "Answer: Go to the Login/Register page and select the 'Volunteer' option during registration." }
      ],
      footer: 'If your query is not listed above, please contact our team directly at: helphubreporting.team@gmail.com',
      placeholder: '🚫 Chat typing is reserved for English support.'
    },
    'te': { // Telugu
      title: 'సహాయం FAQ',
      subtitle: 'సాధారణ ప్రశ్నలు & పరిష్కారాలు',
      instruction: 'సాధారణ ప్రశ్నలు మరియు సమాధానాలు ఇక్కడ ఉన్నాయి:',
      qa: [
        { q: "❓ నేను ఫోటోను అప్‌లోడ్ చేయలేకపోతున్నాను?", a: "సమాధానం: మీ ఇంటర్నెట్ కనెక్షన్‌ని తనిఖీ చేయండి. ఫోటో సైజు 5MB లోపు ఉండేలా చూసుకోండి." },
        { q: "❓ లొకేషన్ పనిచేయడం లేదు?", a: "సమాధానం: మీ ఫోన్‌లోని GPS ఆన్ చేసి ఉందని నిర్ధారించుకోండి. బ్రౌజర్‌లో లొకేషన్ పర్మిషన్లు ఇవ్వండి." },
        { q: "❓ సమస్యను ఎలా నివేదించాలి?", a: "సమాధానం: మీ డ్యాష్‌బోర్డ్‌కు వెళ్లి, 'సమస్యను నివేదించు' (Report an Issue) క్లిక్ చేయండి." },
        { q: "❓ వాలంటీర్‌గా ఎలా నమోదు చేసుకోవాలి?", a: "సమాధానం: లాగిన్ పేజీకి వెళ్లి, 'వాలంటీర్' (Volunteer) ఎంపికను ఎంచుకోండి." }
      ],
      footer: 'మీ ప్రశ్న ఇక్కడ లేకపోతే, దయచేసి మా బృందాన్ని ఇమెయిల్ ద్వారా సంప్రదించండి: helphubreporting.team@gmail.com',
      placeholder: '🚫 చాట్ టైపింగ్ ఇంగ్లీష్ సపోర్ట్ కోసం మాత్రమే అందుబాటులో ఉంది.'
    },
    'hi': { // Hindi
      title: 'सहायता FAQ',
      subtitle: 'सामान्य प्रश्न और समाधान',
      instruction: 'यहाँ सामान्य प्रश्न और उत्तर दिए गए हैं:',
      qa: [
        { q: "❓ मैं फोटो अपलोड नहीं कर पा रहा हूँ?", a: "उत्तर: अपने इंटरनेट की जांच करें। फोटो का आकार 5MB से कम होना चाहिए।" },
        { q: "❓ लोकेशन काम नहीं कर रहा है?", a: "उत्तर: सुनिश्चित करें कि आपके फोन का GPS ऑन है। ब्राउज़र में लोकेशन की अनुमति दें।" },
        { q: "❓ शिकायत कैसे दर्ज करें?", a: "उत्तर: डैशबोर्ड पर जाएं और 'रिपोर्ट एन इश्यू' पर क्लिक करें।" },
        { q: "❓ वॉलंटियर के रूप में पंजीकरण कैसे करें?", a: "उत्तर: लॉगिन पेज पर जाएं और 'वॉलंटियर' विकल्प चुनें।" }
      ],
      footer: 'यदि आपका प्रश्न यहाँ नहीं है, तो कृपया हमें ईमेल करें: helphubreporting.team@gmail.com',
      placeholder: '🚫 चैट टाइपिंग केवल अंग्रेजी सहायता के लिए उपलब्ध है।'
    },
    'ta': { // Tamil
      title: 'உதவி FAQ',
      subtitle: 'பொதுவான கேள்விகள் மற்றும் தீர்வுகள்',
      instruction: 'பொதுவான கேள்விகள் மற்றும் பதில்கள் இங்கே உள்ளன:',
      qa: [
        { q: "❓ என்னால் புகைப்படத்தைப் பதிவேற்ற முடியவில்லையா?", a: "பதில்: உங்கள் இணைய இணைப்பைச் சரிபார்க்கவும். புகைப்படம் 5MB க்கும் குறைவாக இருப்பதை உறுதி செய்யவும்." },
        { q: "❓ இருப்பிடம் (Location) வேலை செய்யவில்லையா?", a: "பதில்: உங்கள் போனில் GPS இயக்கப்பட்டுள்ளதா என்பதை உறுதிப்படுத்தவும்." },
        { q: "❓ புகாரை எவ்வாறு பதிவு செய்வது?", a: "பதில்: டேஷ்போர்டிற்குச் சென்று, 'Report an Issue' என்பதை கிளிக் செய்யவும்." },
        { q: "❓ தன்னார்வலராக (Volunteer) பதிவு செய்வது எப்படி?", a: "பதில்: உள்நுழைவு (Login) பக்கத்திற்குச் சென்று, 'Volunteer' என்பதைத் தேர்ந்தெடுக்கவும்." }
      ],
      footer: 'உங்கள் கேள்வி இங்கே இல்லை என்றால், மின்னஞ்சல் மூலம் எங்களைத் தொடர்பு கொள்ளவும்: helphubreporting.team@gmail.com',
      placeholder: '🚫 அரட்டை தட்டச்சு ஆங்கில ஆதரவிற்கு மட்டுமே ஒதுக்கப்பட்டுள்ளது.'
    }
  };

  const currentFaq = faqData[language] || faqData['en'];

  useEffect(() => {
    setMounted(true);
    
    if (language === 'en') {
      setMessages([
        {
          id: 1,
          text: t('assistant_greeting') || "Hello! I am your HelpHub assistant. How can I help you today?",
          sender: 'bot',
          timestamp: new Date()
        }
      ]);
    } else {
      const initialMessages: Message[] = [
        { id: 1, text: currentFaq.instruction, sender: 'bot', timestamp: new Date() }
      ];
      
      currentFaq.qa.forEach((item: any, idx: number) => {
        initialMessages.push({
          id: idx + 2,
          text: `${item.q}\n${item.a}`,
          sender: 'bot',
          timestamp: new Date()
        });
      });

      initialMessages.push({
        id: 100,
        text: currentFaq.footer,
        sender: 'bot',
        timestamp: new Date()
      });

      setMessages(initialMessages);
    }
  }, [language]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Hardcoded responses removed in favor of real AI.

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || language !== 'en') return;

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
      // Call the stable Gemini endpoint
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg.text,
          language: language,
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
              ⬅️ {t('back')}
            </button>
            <h2 style={{ color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              🤖 {currentFaq.title}
            </h2>
            <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {currentFaq.subtitle}
            </p>
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
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: msg.sender === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
                  backgroundColor: msg.sender === 'user' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                  border: msg.sender === 'bot' ? '1px solid var(--border)' : 'none',
                  color: msg.sender === 'user' ? '#fff' : 'var(--text-main)',
                  lineHeight: '1.5',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-line'
                }}>
                  {msg.text}
                </div>
                {mounted && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px', padding: '0 5px' }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
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
            {language === 'en' ? (
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t('chat_placeholder')}
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
                  {t('submit')}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>
                {currentFaq.placeholder}
              </div>
            )}
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
