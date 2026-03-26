import fs from 'fs';
import https from 'https';
import path from 'path';

const envFilePath = path.join(process.cwd(), 'frontend', '.env.local');
const envFile = fs.readFileSync(envFilePath, 'utf8');
const keyMatch = envFile.match(/GEMINI_API_KEY=["']?([^"'\n]+)["']?/);
const key = keyMatch ? keyMatch[1] : null;

if (!key) {
  console.log("No API key found in .env.local");
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.models) {
        console.log("Available models:");
        parsed.models.forEach(m => {
          if (m.supportedGenerationMethods.includes('generateContent')) {
            console.log(m.name);
          }
        });
      } else {
        console.log("Error or no models returned:", parsed);
      }
    } catch (e) {
      console.log("Parse error:", data);
    }
  });
}).on('error', (e) => {
  console.error("HTTP error:", e);
});
