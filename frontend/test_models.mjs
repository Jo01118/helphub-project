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

const models = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-1.0-pro'
];

async function checkModel(model) {
    return new Promise((resolve) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const postData = JSON.stringify({
            contents: [{ parts: [{ text: "Hi" }] }]
        });

        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ model, status: res.statusCode, data });
            });
        });

        req.on('error', (e) => {
            resolve({ model, status: 'Error', error: e.message });
        });

        req.write(postData);
        req.end();
    });
}

async function run() {
    for (const model of models) {
        const result = await checkModel(model);
        console.log(`Model: ${model}, Status: ${result.status}`);
        if (result.status !== 200) {
            try {
                const parsed = JSON.parse(result.data);
                console.log(`   Error: ${parsed.error?.message || 'Unknown error'}`);
            } catch (e) {
                console.log(`   Raw Response: ${result.data}`);
            }
        } else {
            console.log(`   Success!`);
        }
    }
}

run();
