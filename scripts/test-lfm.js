const https = require('https');
const fs = require('fs');
const path = require('path');

// Basic .env.local loader
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKey = envContent.match(/OPENROUTER_API_KEY=(.*)/)?.[1]?.trim();

const model = 'liquid/lfm-2.5-1.2b-thinking:free';

async function test() {
    console.log(`🚀 Testing: ${model}`);

    if (!apiKey) {
        console.error('❌ KEY NOT FOUND');
        return;
    }

    const data = JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'What is an Arduino? Answer in 10 words.' }]
    });

    const options = {
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'Circuito Test'
        }
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (d) => body += d);
        res.on('end', () => {
            const json = JSON.parse(body);
            console.log('✅ Response:', json.choices?.[0]?.message?.content || 'NO CONTENT');
        });
    });

    req.on('error', (e) => console.error(e));
    req.write(data);
    req.end();
}

test();
