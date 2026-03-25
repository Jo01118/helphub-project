import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API with your GEMINI_API_KEY
// Fallback if not configured carefully prevents crashing, though won't work without key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_KEY');

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        text: "System Alert: The Gemini API Key is missing. Please ask the administrator to configure the GEMINI_API_KEY environment variable. Until then, I cannot answer queries dynamically."
      });
    }

    // Configure the model behavior for HelpHub
    const systemPrompt = `You are the friendly and professional automated assistant for HelpHub, a community issue-reporting application. 
Your goal is to assist users in navigating the app, reporting issues (like potholes, animal issues, waste, infrastructure, etc.), and giving basic instructions.
- HelpHub is a Progressive Web App (PWA) so users can install it and use it offline, although creating reports requires internet.
- If they ask to change profile/name/password, tell them to visit the 'My Profile' tab in the Dashboard.
- If they have forgotten their password, they can use Account Recovery Codes in their Profile tab (if saved previously).
- Standard issue resolution takes 2-4 business days via volunteers or admins.
- If they ask out-of-scope, non-app questions, politely decline and provide the admin email: helphubreporting.team@gmail.com.
Do not provide formatting that cannot be rendered in plain text (avoid markdown if possible, just use standard paragraphs). Keep answers concise and helpful.`;

    // Map history to Gemini's format. We push the system prompt as the first invisible interaction 
    // to ensure compatibility with 'gemini-pro' which is supported in all regions/keys.
    const formattedHistory = [
      { role: "user", parts: [{ text: `System Instructions: ${systemPrompt}\n\nAcknowledge these instructions and get ready to assist.` }] },
      { role: "model", parts: [{ text: "Understood. I am ready to act as the HelpHub assistant." }] }
    ];

    if (history) {
      history.forEach((msg: any) => {
        formattedHistory.push({
          role: msg.sender === 'bot' ? 'model' : 'user',
          parts: [{ text: msg.text || " " }],
        });
      });
    }

    // Use gemini-pro for maximum compatibility
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        maxOutputTokens: 250,
      },
    });

    const result = await chat.sendMessage(message);
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
