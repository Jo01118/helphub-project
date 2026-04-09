import { GoogleGenerativeAI } from '@google/generative-ai';

async function checkModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    try {
        console.log("Checking available models...");
        const modelsToTest = [
            "gemini-2.0-flash",
            "gemini-flash-latest",
            "gemini-flash-lite-latest",
            "gemini-2.0-flash-lite",
            "gemini-pro-latest"
        ];

        for (const modelName of modelsToTest) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                await model.generateContent("hi");
                console.log(`✅ SUCCESS: ${modelName}`);
            } catch (err) {
                console.log(`❌ FAIL: ${modelName} - ${err.message}`);
            }
        }
    } catch (error) {
        console.log("Error in diagnostic:", error.message);
    }
}

checkModels();
