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

    // Optimized multi-model fallback: using Lite models first for fastest response times
    const modelsToTry = [
      "gemini-2.0-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-2.0-flash",
      "gemini-flash-latest"
    ];

    let responseText = "";
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          systemInstruction: systemPrompt 
        });

        const chat = model.startChat({
          history: formattedHistory,
          generationConfig: {
            maxOutputTokens: 500,
          },
        });

        // Use AbortController for a 7-second timeout to ensure fast failover
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        try {
          // Pass the signal to ensure we stop waiting for slow models
          const result = await chat.sendMessage(message, { signal: controller.signal });
          responseText = result.response.text();
          clearTimeout(timeoutId);
          if (responseText) break;
        } catch (innerErr: any) {
          clearTimeout(timeoutId);
          throw innerErr;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed or timed out:`, err.message);
        lastError = err;
        continue; // Try the next model immediately
      }
    }

    if (!responseText) {
      // Friendly fallback instead of technical error
      return NextResponse.json({ 
        text: "Hello! Our AI assistant is currently resting after a busy day. 🤖\n\nI'm temporarily unavailable, but I'll be back soon! In the meantime, you can check our Support FAQ above or reach out to us directly at helphubreporting.team@gmail.com for urgent assistance. Thank you for your patience!" 
      });
    }

    return NextResponse.json({ text: responseText });

  } catch (error: any) {
    console.error("Critical Chat API Error:", error);
    return NextResponse.json(
      { text: "Hello! I am currently taking a quick break to recharge my circuits. ⚡ Please try messaging me again in a few minutes!" },
      { status: 200 } // Return 200 so the UI doesn't crash
    );
  }
}
