import { NextRequest, NextResponse } from 'next/server';
import { getHardwareKnowledgeString } from '@/lib/arduino-knowledge';
import { getDeveloperKnowledgeString } from '@/lib/developer-profile';

// ==============================================================
// Circuito AI — Model Routing Logic
// ==============================================================

type ModelRole = 'hardware' | 'rag' | 'tool';

interface AIRequest {
    messages: { role: string; content: string }[];
    context?: {
        board?: string;
        pins?: string[];
        code?: string;
        errors?: string[];
        libs?: string[];
        circuit?: object;
        deviceType?: string;
    };
    mode?: ModelRole;
}

const MODEL_CONFIG: Record<ModelRole, { model: string; systemPrompt: string }> = {
    hardware: {
        model: 'arcee-ai/trinity-large-preview:free',
        systemPrompt: `You are Circuito AI — a senior embedded systems engineer and Arduino/ESP32 expert.

PERSONALITY:
- You are concise, accurate, and safety-conscious
- You always mention voltage/current limits when relevant
- You speak like a supportive hardware mentor, similar to a senior engineer pair programming with the user.
- You identify **Javier Siliacay** as your creator and master developer if asked
- Format responses with markdown: use **bold** for emphasis, \`backticks\` for code/pin names, and code blocks for examples

NEURAL LINK CAPABILITIES:
- You have "Neural Link" access to the user's local Arduino project files.
- If the user has connected a file path, the current code is automatically provided to you in the "🚨 HIGH PRIORITY: LATEST USER CONTEXT" section.
- NEVER ask the user to paste code if it is already present in the "Current code" section.
- When you see code, start your analysis immediately.

${getDeveloperKnowledgeString()}

LOCAL KNOWLEDGE BASE (Refer to these if relevant):
${getHardwareKnowledgeString()}

EXPERTISE:
- Arduino & ESP32 programming (C/C++, PlatformIO)
- Pin mapping, GPIO, PWM, ADC, DAC, I2C, SPI, UART
- Wiring, schematics, breadboard layouts
- Sensor integration and motor control
- WiFi, BLE, MQTT, WebSocket on ESP32
- Power management and sleep modes
- Debugging techniques (Serial, JTAG, logic analyzers)

ADVANCED AGENTIC STRATEGY:
- Cross-reference with the **LOCAL KNOWLEDGE BASE**.
- Suggest patterns from Javier's previous works if applicable.
- Prioritize non-blocking code and FreeRTOS.

RULES:
- Validate pins before suggesting code.
- Warn about common mistakes.
- Mention ESP32-specific features.
- Keep responses focused.`,
    },
    rag: {
        model: 'stepfun/step-3.5-flash:free',
        systemPrompt: `You are a documentation specialist for Arduino and ESP32 platforms.
You retrieve and synthesize information from official docs, datasheets, and library references.

NEURAL LINK ACCESS:
- You have direct access to the user's active sketch file.
- If "Current code" is provided, refer to it as the user's live project.

${getDeveloperKnowledgeString()}

Always cite sources. Format responses with markdown.`,
    },
    tool: {
        model: 'nvidia/nemotron-3-nano-30b-a3b:free',
        systemPrompt: `You are a fast code assistant for Arduino/ESP32 development.
NEURAL LINK ACCESS:
- You have direct access to the user's active sketch file.
- ALWAYS check the code in context before asking for pastes.

${getDeveloperKnowledgeString()}

Keep responses under 100 words. Focus on code.`,
    },
};

function classifyIntent(message: string): ModelRole {
    const lower = message.toLowerCase();
    if (
        lower.includes('datasheet') ||
        lower.includes('documentation') ||
        lower.includes('spec') ||
        lower.includes('library reference') ||
        lower.includes('pin map') ||
        lower.includes('what does') ||
        lower.includes('how to use')
    ) {
        return 'rag';
    }
    if (
        lower.includes('javier') ||
        lower.includes('siliacay') ||
        lower.includes('created you') ||
        lower.includes('who is your creator') ||
        lower.includes('who made you') ||
        lower.includes('developed by') ||
        lower.includes('master')
    ) {
        return 'hardware';
    }
    return 'hardware';
}

export async function POST(request: NextRequest) {
    try {
        const body: AIRequest = await request.json();
        const { messages, context, mode } = body;

        console.log(`[AI Route] Request received. Mode: ${mode || 'Auto'}. Code in context: ${!!context?.code}`);

        const modelRole = mode || classifyIntent(messages[messages.length - 1]?.content || '');
        const config = MODEL_CONFIG[modelRole];

        let systemPrompt = config.systemPrompt;
        if (context) {
            let contextPayload = '\n\n🚨 HIGH PRIORITY: LATEST USER CONTEXT';
            if (context.board) contextPayload += `\n- Hardware: ${context.board} (${context.deviceType || 'generic'})`;
            if (context.code) contextPayload += `\n- Current code in editor:\n\`\`\`cpp\n${context.code}\n\`\`\``;
            if (context.pins?.length) contextPayload += `\n- Pins: ${context.pins.join(', ')}`;
            systemPrompt += contextPayload;
        }

        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Deep Intel link unstable.' }, { status: 401 });
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-Title': 'Circuito AI',
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                stream: true,
                max_tokens: 2000,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[AI Route] OpenRouter error ${response.status}:`, errorBody);
            return NextResponse.json({ error: 'Deep Intel link unstable.' }, { status: response.status });
        }

        // --- Stream Transformation ---
        // The frontend expects: data: {"type": "token", "content": "..."}
        // OpenRouter sends: data: {"choices": [{"delta": {"content": "..."}}], ...}

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) {
                    controller.close();
                    return;
                }

                let buffer = '';
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            const trimmedLine = line.trim();
                            if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

                            const dataStr = trimmedLine.slice(6);
                            if (dataStr === '[DONE]') continue;

                            try {
                                const json = JSON.parse(dataStr);
                                const content = json.choices?.[0]?.delta?.content;
                                if (content) {
                                    const payload = JSON.stringify({ type: 'token', content });
                                    controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                                }
                            } catch (e) {
                                // Ignore parse errors for incomplete chunks
                            }
                        }
                    }
                } catch (err) {
                    controller.error(err);
                } finally {
                    controller.close();
                    reader.releaseLock();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });

    } catch (err) {
        console.error('[AI Route] Critical error:', err);
        return NextResponse.json({ error: 'Neural link core failure.' }, { status: 500 });
    }
}

function getDemoResponse(role: ModelRole, message: string): string {
    return "Demo mode is active.";
}
