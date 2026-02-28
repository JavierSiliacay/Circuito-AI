import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { prompt } = await request.json();
        const apiKey = process.env.OPENROUTER_API_KEY?.trim();

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API Key not configured. Please add OPENROUTER_API_KEY to the .env.local file' },
                { status: 401 }
            );
        }

        let technicalDraft = prompt;
        try {
            const technicalResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                    'X-Title': 'Circuito AI',
                },
                body: JSON.stringify({
                    model: 'openrouter/free',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a Technical Hardware Architect.
                            Create a detailed prompt for a circuit blueprint.
                            Focus on: blue background, glowing cyan lines, specific components.`
                        },
                        {
                            role: 'user',
                            content: `Analyze: "${prompt}". Generate image prompt.`
                        }
                    ],
                }),
            });

            if (technicalResponse.ok) {
                const technicalData = await technicalResponse.json();
                technicalDraft = technicalData.choices?.[0]?.message?.content || prompt;
                // Safety: Limit prompt length to avoid broken URLs
                technicalDraft = technicalDraft.slice(0, 800).replace(/["']/g, '');
            }
        } catch (e) {
            console.warn('Supervisor failed, using raw prompt fallback:', e);
        }

        // === STEP 2: THE ARTIST (Free Generation via Pollinations) ===
        // Pollinations is a reliable free API that generates high-quality images from a URL
        // We encode the prompt to ensure it works in the URL
        const seed = Math.floor(Math.random() * 100000);
        const encodedPrompt = encodeURIComponent(`${technicalDraft}, futuristic electronic schematic, clean lines, dark background, 4k resolution, technical drafting style, blueprint`);
        const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=768&nologo=true&seed=${seed}&enhance=true`;

        // We return the URL directly. This uses 0 OpenRouter credits for the heavy lifting.
        return NextResponse.json({ imageUrl });
    } catch (error) {
        console.error('Circuit image generation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
