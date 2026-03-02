
async function testAI() {
    try {
        const response = await fetch('http://localhost:3000/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'write a simple blink code' }],
                context: { board: 'ESP32' }
            })
        });

        if (!response.ok) {
            console.error('Error status:', response.status);
            console.error('Body:', await response.text());
            return;
        }

        const body = response.body;
        const reader = body.getReader();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            console.log('Chunk:', new TextDecoder().decode(value));
        }

        console.log('Done');
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

testAI();
