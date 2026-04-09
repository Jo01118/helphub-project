async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    try {
        console.log("Fetching model list from API...");
        const res = await fetch(url);
        const data = await res.json();
        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                console.log(`- ${m.name} (${m.displayName}) - Supported: ${m.supportedGenerationMethods.join(', ')}`);
            });
        } else {
            console.log("No models found or error:", JSON.stringify(data));
        }
    } catch (err) {
        console.error("Fetch error:", err.message);
    }
}

listModels();
