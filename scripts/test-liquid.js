const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function testLiquidModel() {
    const model = 'liquid/lfm-2.5-1.2b-thinking:free';
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        console.error('❌ Error: OPENROUTER_API_KEY not found in .env.local');
        return;
    }

    console.log(`🚀 Testing Model: ${model}`);
    console.log('---');

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-Title': 'Circuito AI Test Script',
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: 'You are a concise hardware expert.' },
                    { role: 'user', content: 'Explain what a pull-up resistor is in 20 words.' }
                ],
                temperature: 0.5,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API Error (${response.status}):`, errorText);
            return;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (content) {
            console.log('✅ AI Response:');
            console.log(content);
        } else {
            console.error('❌ No content received from the model.');
            process.stdout.write(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('❌ Critical Error during test:', error);
    }
}

testLiquidModel();
