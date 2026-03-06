import dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config({ path: `${process.cwd()}/.env.local` });

async function testModel() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const modelId = "google/gemini-2.0-flash-exp:free";

    let log = `Testing model: ${modelId}\n`;

    if (!apiKey) {
        log += "Error: OPENROUTER_API_KEY not found in .env.local\n";
        fs.writeFileSync('scripts/test-result.txt', log);
        return;
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: 'user', content: 'Say "Working" if you can hear me.' }
                ],
            }),
        });

        const data = await response.json();

        if (response.ok) {
            log += "Success! Response from AI:\n";
            log += data.choices?.[0]?.message?.content || "No content returned";
        } else {
            log += `Error ${response.status}:\n`;
            log += JSON.stringify(data, null, 2);
        }
    } catch (err) {
        log += `Failed to connect to OpenRouter: ${err}\n`;
    }

    fs.writeFileSync('scripts/test-result.txt', log);
    console.log("Result written to scripts/test-result.txt");
}

testModel();
