'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Language = 'en' | 'te' | 'ta' | 'hi';

interface Dictionary {
  [key: string]: string;
}

const translations: Record<Language, Dictionary> = {
  en: {
    helphub: 'HelpHub',
    hero_title_1: 'Report, Resolve,',
    hero_title_2: 'Rebuild.',
    hero_subtitle: 'The modern way to report civic and welfare issues in your neighborhood. From potholes to public safety, let your voice be heard—even anonymously.',
    get_started: 'Get Started',
    subtitle: 'Civic and Welfare Reporting System',
    select_language: 'Select Language',
    user_access: 'User Login / Register',
    admin_access: 'Admin',
    volunteer_access: 'Volunteer Login / Register',
    anonymous_report: 'Report Anonymously',
    login: 'Login',
    register: 'Register',
    report_issue: 'Report an Issue',
    my_reports: 'My Reports',
    emergency_call: 'Emergency Call',
    instructions: 'Instructions / Help',
    name: 'Name',
    phone: 'Phone Number',
    age: 'Age',
    city: 'City',
    email: 'Email',
    password: 'Password',
    confirm_password: 'Confirm Password',
    submit: 'Submit',
    back: 'Back',
  },
  te: {
    helphub: 'హెల్ప్‌హబ్',
    hero_title_1: 'నివేదించండి, పరిష్కరించండి,',
    hero_title_2: 'పునర్నిర్మించండి.',
    hero_subtitle: 'మీ ప్రాంతంలోని పౌర మరియు సంక్షేమ సమస్యలను నివేదించడానికి ఆధునిక మార్గం. మీ గొంతు వినిపించండి—అనామకంగా కూడా.',
    get_started: 'ప్రారంభించండి',
    subtitle: 'పౌర మరియు సంక్షేమ నివేదన వ్యవస్థ',
    select_language: 'భాషను ఎంచుకోండి',
    user_access: 'వినియోగదారు లాగిన్ / నమోదు',
    admin_access: 'అడ్మిన్',
    volunteer_access: 'వాలంటీర్ లాగిన్ / నమోదు',
    anonymous_report: 'అనామకంగా నివేదించండి',
    login: 'లాగిన్',
    register: 'నమోదు',
    report_issue: 'సమస్యను నివేదించండి',
    my_reports: 'నా నివేదికలు',
    emergency_call: 'అత్యవసర కాల్',
    instructions: 'సూచనలు / సహాయం',
    name: 'పేరు',
    phone: 'ఫోన్ నంబర్',
    age: 'వయస్సు',
    city: 'నగరం',
    email: 'ఇమెయిల్',
    password: 'పాస్‌వర్డ్',
    confirm_password: 'పాస్‌వర్డ్ నిర్ధారించండి',
    submit: 'సమర్పించండి',
    back: 'వెనక్కి',
  },
  ta: {
    helphub: 'ஹெல்ப்ஹப்',
    hero_title_1: 'புகாரளி, தீர்,',
    hero_title_2: 'மீண்டும் உருவாக்கு.',
    hero_subtitle: 'உங்கள் பகுதியில் உள்ள குடிமக்கள் மற்றும் நலன்புரி பிரச்சனைகளை புகாரளிப்பதற்கான நவீன வழி. அநாமதேயமாக இருந்தாலும் உங்கள் குரல் கேட்கட்டும்.',
    get_started: 'தொடங்குங்கள்',
    subtitle: 'குடிமக்கள் மற்றும் நலன்புரி அறிக்கை அமைப்பு',
    select_language: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    user_access: 'பயனர் உள்நுழைவு / பதிவு',
    admin_access: 'நிர்வாகி',
    volunteer_access: 'தன்னார்வலர் உள்நுழைவு / பதிவு',
    anonymous_report: 'அநாமதேயமாக புகாரளிக்கவும்',
    login: 'உள்நுழைக',
    register: 'பதிவு செய்',
    report_issue: 'பிரச்சனையை புகாரளிக்கவும்',
    my_reports: 'என் அறிக்கைகள்',
    emergency_call: 'அவசர அழைப்பு',
    instructions: 'வழிமுறைகள் / உதவி',
    name: 'பெயர்',
    phone: 'தொலைபேசி எண்',
    age: 'வயது',
    city: 'நகரம்',
    email: 'மின்னஞ்சல்',
    password: 'கடவுச்சொல்',
    confirm_password: 'கடவுச்சொல்லை உறுதிப்படுத்தவும்',
    submit: 'சமர்ப்பி',
    back: 'திரும்பவும்',
  },
  hi: {
    helphub: 'हेल्पहब',
    hero_title_1: 'रिपोर्ट करें, समाधान करें,',
    hero_title_2: 'पुनर्निर्माण करें।',
    hero_subtitle: 'अपने पड़ोस में नागरिक और कल्याणकारी मुद्दों की रिपोर्ट करने का आधुनिक तरीका। अपनी आवाज़ सुनाएँ—भले ही गुमनाम रूप से।',
    get_started: 'शुरू करें',
    subtitle: 'नागरिक और कल्याण रिपोर्टिंग प्रणाली',
    select_language: 'भाषा चुनें',
    user_access: 'उपयोगकर्ता लॉगिन / पंजीकरण',
    admin_access: 'व्यवस्थापक',
    volunteer_access: 'स्वयंसेवक लॉगिन / पंजीकरण',
    anonymous_report: 'गुमनाम रूप से रिपोर्ट करें',
    login: 'लॉग इन करें',
    register: 'पंजीकरण करें',
    report_issue: 'समस्या की रिपोर्ट करें',
    my_reports: 'मेरी रिपोर्ट',
    emergency_call: 'आपातकालीन कॉल',
    instructions: 'निर्देश / सहायता',
    name: 'नाम',
    phone: 'फ़ोन नंबर',
    age: 'आयु',
    city: 'शहर',
    email: 'ईमेल',
    password: 'पासवर्ड',
    confirm_password: 'पासवर्ड की पुष्टि करें',
    submit: 'जमा करें',
    back: 'वापस',
  }
};

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('helphub_lang') as Language;
    if (saved && translations[saved]) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('helphub_lang', lang);
    setLanguageState(lang);
  };

  const t = (key: string) => {
    return translations[language as Language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
