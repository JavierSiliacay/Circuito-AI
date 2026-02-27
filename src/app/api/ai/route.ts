import { NextRequest, NextResponse } from 'next/server';

// ==============================================================
// Circuito AI — Model Routing Logic
// ==============================================================
// This route handles AI chat requests using 3 specialized models
// via OpenRouter. The server determines which model to use based
// on the user's intent.
//
// 1️⃣  Hardware Expert  — wiring, pins, debugging, Arduino/ESP32 code
// 2️⃣  RAG Reasoner     — docs, datasheets, library references
// 3️⃣  Fast Tool/IDE    — autocomplete, inline fix, quick explain
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

// Model configuration — using reliable OpenRouter model IDs
const MODEL_CONFIG: Record<ModelRole, { model: string; systemPrompt: string }> = {
    hardware: {
        model: 'arcee-ai/trinity-large-preview:free',
        systemPrompt: `You are Circuito AI — a senior embedded systems engineer and Arduino/ESP32 expert.

PERSONALITY:
- You are concise, accurate, and safety-conscious
- You always mention voltage/current limits when relevant
- You speak like a supportive hardware mentor
- You use code examples to illustrate points
- Format responses with markdown: use **bold** for emphasis, \`backticks\` for code/pin names, and code blocks for examples

EXPERTISE:
- Arduino & ESP32 programming (C/C++, PlatformIO)
- Pin mapping, GPIO, PWM, ADC, DAC, I2C, SPI, UART
- Wiring, schematics, breadboard layouts
- Sensor integration and motor control
- WiFi, BLE, MQTT, WebSocket on ESP32
- Power management and sleep modes
- Debugging techniques (Serial, JTAG, logic analyzers)

RULES:
- Always validate pin assignments before suggesting code
- Warn about common mistakes (wrong voltage, floating pins, missing pull-ups)
- Prefer non-blocking code (millis()) over delay()
- Suggest #define or const for pin numbers
- Mention ESP32-specific features when relevant (dual-core, RTC, ULP)
- Keep responses focused and under 300 words unless code examples make it longer`,
    },
    rag: {
        model: 'stepfun/step-3.5-flash:free',
        systemPrompt: `You are a documentation specialist for Arduino and ESP32 platforms.
You retrieve and synthesize information from official docs, datasheets, and library references.
Always cite the source of information when possible.
Be precise about specifications, pin configurations, and library APIs.
Format responses with markdown for readability.`,
    },
    tool: {
        model: 'nvidia/nemotron-3-nano-30b-a3b:free',
        systemPrompt: `You are a fast code assistant for Arduino/ESP32 development.
Provide brief, actionable responses for code completions, quick fixes, and explanations.
Keep responses under 100 words unless asked for detail.
Focus on code, not explanations.`,
    },
};

function classifyIntent(message: string): ModelRole {
    const lower = message.toLowerCase();

    // RAG indicators
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

    // Tool/IDE indicators
    if (
        lower.includes('fix this') ||
        lower.includes('autocomplete') ||
        lower.includes('rename') ||
        lower.includes('refactor') ||
        lower.includes('quick') ||
        lower.includes('inline') ||
        message.length < 30
    ) {
        return 'tool';
    }

    // Default to hardware expert
    return 'hardware';
}

export async function POST(request: NextRequest) {
    try {
        const body: AIRequest = await request.json();
        const { messages, context, mode } = body;

        // Determine which model to use
        const modelRole = mode || classifyIntent(messages[messages.length - 1]?.content || '');
        const config = MODEL_CONFIG[modelRole];

        // Build context-aware system prompt
        let systemPrompt = config.systemPrompt;
        if (context) {
            systemPrompt += '\n\nCURRENT CONTEXT:';
            if (context.board) systemPrompt += `\n- Board: ${context.board}`;
            if (context.pins?.length) systemPrompt += `\n- Pins in use: ${context.pins.join(', ')}`;
            if (context.code) systemPrompt += `\n- Current code:\n\`\`\`cpp\n${context.code}\n\`\`\``;
            if (context.errors?.length) systemPrompt += `\n- Errors: ${context.errors.join('; ')}`;
            if (context.libs?.length) systemPrompt += `\n- Libraries: ${context.libs.join(', ')}`;
            if (context.deviceType) systemPrompt += `\n- Device: ${context.deviceType}`;
        }

        const apiKey = process.env.OPENROUTER_API_KEY;

        // ============ DEMO MODE (no API key) — stream simulated response ============
        if (!apiKey) {
            const demoText = getDemoResponse(modelRole, messages[messages.length - 1]?.content || '');
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                    // Send metadata
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', modelRole })}\n\n`));

                    // Stream character by character with variable speed
                    for (let i = 0; i < demoText.length; i++) {
                        const chunk = demoText.substring(i, Math.min(i + 3, demoText.length));
                        i += chunk.length - 1; // advance by chunk size
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`));
                        await new Promise(r => setTimeout(r, 15 + Math.random() * 20));
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
                    controller.close();
                },
            });

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    Connection: 'keep-alive',
                },
            });
        }

        // ============ LIVE MODE — stream from OpenRouter ============
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
                'X-Title': 'Circuito AI',
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages,
                ],
                max_tokens: 1024,
                temperature: modelRole === 'tool' ? 0.1 : 0.7,
                stream: true,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('OpenRouter error:', error);
            return NextResponse.json(
                { error: 'AI service error', details: error },
                { status: response.status }
            );
        }

        // Transform OpenRouter's SSE stream into our format
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = response.body?.getReader();

        const stream = new ReadableStream({
            async start(controller) {
                // Send metadata first
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', modelRole })}\n\n`));

                if (!reader) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
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
                            const trimmed = line.trim();
                            if (!trimmed || !trimmed.startsWith('data: ')) continue;
                            const data = trimmed.slice(6);
                            if (data === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices?.[0]?.delta?.content;
                                if (content) {
                                    controller.enqueue(
                                        encoder.encode(`data: ${JSON.stringify({ type: 'token', content })}\n\n`)
                                    );
                                }
                            } catch {
                                // Skip unparseable chunks
                            }
                        }
                    }
                } catch (err) {
                    console.error('Stream error:', err);
                } finally {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    } catch (error) {
        console.error('AI route error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

function getDemoResponse(role: ModelRole, userMessage: string): string {
    const responses: Record<ModelRole, string> = {
        hardware: `Based on your ESP32 DevKit V1 setup, here's my analysis:

The GPIO 2 pin is correctly assigned for the onboard LED. For a more robust implementation, I'd recommend using \`millis()\` instead of \`delay()\`:

\`\`\`cpp
unsigned long previousMillis = 0;
const long interval = 1000;
bool ledState = false;

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    ledState = !ledState;
    digitalWrite(ledPin, ledState);
    Serial.println(ledState ? "LED: ON" : "LED: OFF");
  }
}
\`\`\`

⚠️ **Note:** GPIO 2 is also connected to the on-board LED on most ESP32 DevKit boards, but it's also a strapping pin. Avoid keeping it HIGH during boot.`,
        rag: `Based on the ESP32 Technical Reference Manual:

**GPIO 2 (ESP32 DevKit V1)**
- Function: GPIO / ADC2_CH2 / TOUCH2 / HSPI_WP
- Output: Yes (push-pull)
- Boot strapping pin: Must be LOW during boot
- Internal pull-up: Available
- Max current: 40mA (recommended 20mA)

Source: Espressif ESP32 Datasheet v4.3, Section 2.2`,
        tool: `Replace \`delay(1000)\` with non-blocking \`millis()\` pattern for better performance.`,
    };

    return responses[role];
}
