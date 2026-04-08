import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API with your GEMINI_API_KEY
// Fallback if not configured carefully prevents crashing, though won't work without key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_KEY');

export async function POST(req: Request) {
  try {
    const { message, history, language } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        text: "System Alert: The Gemini API Key is missing. Please ask the administrator to configure the GEMINI_API_KEY environment variable. Until then, I cannot answer queries dynamically."
      });
    }

    // Language mapping for the prompt
    const langNames: Record<string, string> = {
      'en': 'English',
      'te': 'Telugu',
      'hi': 'Hindi',
      'ta': 'Tamil'
    };
    const targetLang = langNames[language as string] || 'English';

    // Configure the model behavior for HelpHub
    const systemPrompt = `You are the friendly and professional automated assistant for HelpHub, a community issue-reporting application. 
Your goal is to assist users in navigating the app, reporting issues (like potholes, animal issues, waste, infrastructure, etc.), and giving basic instructions.
- HelpHub is a Progressive Web App (PWA) so users can install it and use it offline, although creating reports requires internet.
- If they ask to change profile/name/password, tell them to visit the 'My Profile' tab in the Dashboard.
- If they have forgotten their password, they can use Account Recovery Codes in their Profile tab (if saved previously).
- Standard issue resolution takes 2-4 business days via volunteers or admins.
- If they ask out-of-scope, non-app questions, politely decline and provide the admin email: helphubreporting.team@gmail.com.
Do not provide formatting that cannot be rendered in plain text (avoid markdown if possible, just use standard paragraphs). Keep answers concise and helpful.

IMPORTANT: The user has selected their language as: ${targetLang}. 
You MUST respond ONLY in ${targetLang}. Even if the user asks in English, you must reply in ${targetLang}.`;

    // Map history to Gemini's format
    const formattedHistory = history ? history.map((msg: any) => ({
      role: msg.sender === 'bot' ? 'model' : 'user',
      parts: [{ text: msg.text }],
    })) : [];

    // Robust Multi-Model Fallback System
    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro", "gemini-1.0-pro"];
    let result;
    let lastError;

    for (const modelName of modelsToTry) {
      let retries = 3;
      while (retries > 0) {
        try {
          // Legacy models (1.0) often don't support systemInstruction in getGenerativeModel
          const isLegacy = modelName.includes("pro") && !modelName.includes("1.5");
          
          const modelOptions: any = { model: modelName };
          if (!isLegacy) {
            modelOptions.systemInstruction = systemPrompt;
          }
          
          const model = genAI.getGenerativeModel(modelOptions);

          const chat = model.startChat({
            history: formattedHistory,
            generationConfig: {
              maxOutputTokens: 1000,
            },
          });

          // For legacy models, prepend the system prompt to the user message
          const finalMessage = isLegacy 
            ? `[SYSTEM INSTRUCTIONS]: ${systemPrompt}\n\n[USER]: ${message}` 
            : message;

          result = await chat.sendMessage(finalMessage);
          break; // Success with this model
        } catch (err: any) {
          lastError = err;
          console.warn(`Gemini Attempt failed for ${modelName}:`, err.message);
          
          // If model not found (404), skip to next model immediately
          if (err.message?.includes('404')) {
            retries = 0; 
            break; 
          }
          
          // Handle rate limits (429) or busy (503) with retries
          if ((err.message?.includes('503') || err.message?.includes('429')) && retries > 1) {
            retries--;
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }
          
          // Other errors: move to next model
          retries = 0;
          break;
        }
      }
      if (result) break;
    }

    if (!result) {
      throw lastError || new Error("Failed to get response from any Gemini model.");
    }

    const responseText = result.response.text();

    return NextResponse.json({ text: responseText });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { text: `System Error: ${error.message || 'Unknown Error'}. Please ensure your API key is valid and the server was restarted.` },
      { status: 500 }
    );
  }
}
