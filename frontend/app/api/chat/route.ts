import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API with your GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_KEY');

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        text: "System Alert: The Gemini API Key is missing. Please ask the administrator to configure the GEMINI_API_KEY environment variable."
      });
    }

    // Configure the model behavior for HelpHub
    // Strictly enforcing English as requested
    const systemPrompt = `You are the friendly and professional automated assistant for HelpHub, a community issue-reporting application. 
Your goal is to assist users in navigating the app, reporting issues, and giving basic instructions.
- HelpHub is a Progressive Web App (PWA).
- IMPORTANT: You MUST respond ONLY in English. Do not attempt to speak other languages even if the user asks.
- If they ask out-of-scope questions, politely decline and provide the admin email: helphubreporting.team@gmail.com.
Keep answers concise and helpful in plain text.`;

    // Map history to Gemini's format
    const formattedHistory = history ? history.map((msg: any) => ({
      role: msg.sender === 'bot' ? 'model' : 'user',
      parts: [{ text: msg.text }],
    })) : [];

    // Use the stable gemini-1.5-flash model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: systemPrompt });

    let result;
    let retries = 3;
    while (retries > 0) {
      try {
        const chat = model.startChat({
          history: formattedHistory,
          generationConfig: {
            maxOutputTokens: 1000,
          },
        });

        result = await chat.sendMessage(message);
        break; // Success
      } catch (err: any) {
        if ((err.message?.includes('503') || err.message?.includes('429')) && retries > 1) {
          retries--;
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        throw err;
      }
    }

    if (!result) throw new Error("Failed to get response after retries");

    const responseText = result.response.text();

    return NextResponse.json({ text: responseText });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { text: `System Error: ${error.message || 'Unknown Error'}. Please ensure your API key is valid.` },
      { status: 500 }
    );
  }
}
