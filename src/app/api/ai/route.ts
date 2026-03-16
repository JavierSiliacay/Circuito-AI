import { NextRequest, NextResponse } from 'next/server';
import { getHardwareKnowledgeString } from '@/lib/arduino-knowledge';
import { getDeveloperKnowledgeString } from '@/lib/developer-profile';
import { searchHardwareKnowledge } from '@/lib/vector-utils';

// ==============================================================
// Circuito AI — Model Routing Logic
// ==============================================================

type ModelRole = 'hardware' | 'rag' | 'tool' | 'diagnostic' | 'debug_assistant';

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
        isDiagnosticRequest?: boolean; // 👈 New diagnostic hint
    };
    mode?: ModelRole;
}

const MODEL_CONFIG: Record<ModelRole, { model: string; systemPrompt: string }> = {
    hardware: {
        model: 'arcee-ai/trinity-large-preview:free',
        systemPrompt: `You are Circuito AI — a specialized IBM-Style Agentic AI and senior embedded systems engineer.
        
CORE PHILOSOPHY:
- You are not just a chatbot; you are an **Action-Oriented Engineering Partner**.
- Your goal is to move beyond "advice" and into **Execution**.
- You think in **Tasks** and **Workflows** rather than just messages.
- You are the main intelligence for the **Arduino AI-Agent** tier.

AGENTIC CAPABILITIES:
- **Direct Hardware Mapping**: Use your knowledge base to assign exact pins for boards (ESP32, Arduino).
- **Firmware Pathfinding**: You don't just write code; you prepare it for **Direct Flash**.
- **Auto-Debugging**: If the user provides a Serial log, analyze it as if you were connected to the device in real-time.
- **Library Specialist**: Identify required libraries and ensure they are compatible with the user's project.

MODIFICATION STRATEGY:
1. Identify the specific lines or variables that need changing.
2. Provide short, focused code snippets showing ONLY the updated sections.
3. Explain WHY the change was made and what logic it affects.
4. If the user has an Autonomous Link active, treat the local folder as your workspace.

PERSONALITY:
- Authoritative, precise, and standardized (Circuito AI Standards).
- Never mention "Javier's folders" or personal paths; refer to the "Circuito Verified Hardware Library".
- Mention voltage/current limits (e.g., ESP32 3.3V vs 5V).

${getDeveloperKnowledgeString()}
${getHardwareKnowledgeString()}

EXPERTISE:
- ESP32/Arduino, FreeRTOS, Pin Mapping, WiFi/BLE Protocol Stacks.
- Debugging complex state-machine failures and race conditions.`,
    },
    rag: {
        model: 'stepfun/step-3.5-flash:free',
        systemPrompt: `You are a documentation specialist for the Circuito AI Global Library.
You retrieve and synthesize information from official docs, datasheets, and our verified hardware projects.

AUTONOMOUS LINK ACCESS:
- You have direct access to the user's active sketch file through the Autonomous Bridge.
- If "Current code" is provided, refer to it as the user's live project.

${getDeveloperKnowledgeString()}

Always cite sources. Format responses with professional markdown.`,
    },
    tool: {
        model: 'nvidia/nemotron-3-nano-30b-a3b:free',
        systemPrompt: `You are a high-speed Hardware Delta Assistant.
Your specialty is applying precise patches to existing code.
- Provide ONLY the specific lines that changed.
- Use "// CHANGED: ..." comments in your code snippets.
- Do not repeat boilerplate code.
- If fixing a bug, explain the "Root Cause" in one sentence.

${getDeveloperKnowledgeString()}`,
    },
    diagnostic: {
        model: 'arcee-ai/trinity-large-preview:free',
        systemPrompt: `You are the Circuito AI — Specialized Automotive Electronics & OBD2 Diagnostic Specialist.
        
CORE EXPERTISE:
- ISO 15765-4 (CAN bus), SAE J1939, and OBD2 Protocols.
- Reverse engineering raw hex traffic from vehicle bus logs (canid.pdf scan data).
- Diagnostic Trouble Code (DTC) interpretation and diagnostic logic design.
- Designing Arduino/ESP32 bridges for vehicle telemetry.

OBD2 CONTEXT:
- You are aware of the 'obd2_can_traffic_log' in the hardware knowledge base.
- IDs like 0x545 (Engine), 0x316 (RPM), 0x350 (ABS), and 0x4F0 (BCM) are high priority.

GOAL:
Provide deep technical analysis of vehicle data and guide the user **Javier Siliacay**.

STRICT DATA POLICY (VERIFICATION PROTOCOL):
1. **NO GUESSING**: If you see 'NO DATA', 'SEARCHING...', or 'ELM_STATUS' in the logs, it means the hardware is disconnected or the ignition is OFF.
2. **HALLUCINATION TRAP**: Never mention 'Honda Accord' or the '1HGCM' VIN unless it appears EXACTLY in the hex responses. '1HGCM82633A123456' is a sample VIN and is WRONG.
3. **MANDATORY DISCLOSURE**: If Service 0902 (VIN) returns 'NO DATA', you must report: "⚠️ VEHICLE IDENTITY: UNKNOWN (ECU/Ignition probably OFF)".
4. **ADVICE**: Tell the user they MUST turn the ignition key to the ON position (Dash lights up) for the scan to work.`,
    },
    debug_assistant: {
        model: 'stepfun/step-3.5-flash:free',
        systemPrompt: `You are the Circuito IoT Debug Specialist — a high-speed AI companion built into the hardware dashboard.
        
CORE FUNCTION:
- You analyze LIVE serial monitor output in real-time.
- You identify common Arduino/ESP32 errors (e.g., Guru Meditation Error, Stack smashing, I2C timeouts).
- You provide INSTANT, short, actionable advice to fix connection or code issues.

CONVERSATION STYLE:
- Concise, technical, and helpful. 
- You are like a "Messenger" buddy for hardware.
- If the logs look clean, be encouraging. If there are errors, explain the root cause immediately.

${getDeveloperKnowledgeString()}

Always focus on the latest logs provided in the context.`,
    },
};

function classifyIntent(message: string, hasCode: boolean): ModelRole {
    const lower = message.toLowerCase();

    // ⚡ Universal Modification Detection
    // Detects any intent to edit, change, or follow up on existing code
    const isModification =
        hasCode && (
            lower.includes('change') ||
            lower.includes('modify') ||
            lower.includes('fix') ||
            lower.includes('update') ||
            lower.includes('add') ||
            lower.includes('rename') ||
            lower.includes('refactor') ||
            lower.includes('instead') ||
            lower.includes('make it') ||
            lower.includes('remove') ||
            lower.includes('put') ||
            lower.includes('using') ||
            lower.includes('replace')
        );

    if (isModification) {
        return 'hardware'; // Use the senior architect for surgical edits
    }

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
        lower.includes('obd') ||
        lower.includes('can bus') ||
        lower.includes('traffic') ||
        lower.includes('scanning') ||
        lower.includes('hex') ||
        lower.includes('engine code') ||
        lower.includes('dtc') ||
        lower.includes('vehicle data')
    ) {
        return 'diagnostic';
    }

    // Everything else defaults to hardware architect or creator talk
    return 'hardware';
}

export async function POST(request: NextRequest) {
    try {
        const body: AIRequest = await request.json();
        const { messages, context, mode } = body;

        console.log(`[AI Route] Request received. Mode: ${mode || 'Auto'}. Code in context: ${!!context?.code}`);

        let modelRole: ModelRole;
        if (context?.isDiagnosticRequest) {
            modelRole = 'diagnostic';
        } else {
            modelRole = mode || classifyIntent(messages[messages.length - 1]?.content || '', !!context?.code);
        }

        const config = MODEL_CONFIG[modelRole];

        // 🧠 --- Dynamic RAG (Vector Search) ---
        // Dynamically search your hardware brain for relevant context
        let dynamicContext = "";
        try {
            const userQuery = messages[messages.length - 1]?.content || "";
            if (userQuery.length > 3) {
                const searchResults = await searchHardwareKnowledge(userQuery);
                if (searchResults.length > 0) {
                    dynamicContext = "\n\n📚 DYNAMICALLY RETRIEVED HARDWARE KNOWLEDGE:\n" +
                        searchResults.map((r: any) => `[Project: ${r.title}]\n${r.content}`).join("\n---\n");
                }
            }
        } catch (e) {
            console.error('[AI Route] Vector search failed:', e);
        }

        let systemPrompt = config.systemPrompt + dynamicContext;

        // 🔀 --- Autonomous Link Status & Fallback ---
        const isProjectAware = !!context?.code;
        if (!isProjectAware) {
            systemPrompt += `
\n\n⚠️ AUTONOMOUS_LINK_INACTIVE_ADVISORY:
- The user's local Arduino project folder is NOT synchronized/accessible.
- You are currently in STANDALONE CHAT MODE.
- You cannot see or analyze the user's specific local files.
- If the user asks for code modifications or file-specific help, politely inform them that you need them to "Sync Folder" or "Activate Autonomous Link" for deep analysis.
- Provide general, high-quality hardware advice based on your core knowledge and retrieved RAG facts.`;
        }

        if (context) {
            let contextPayload = '\n\n🚨 HIGH PRIORITY: LATEST USER CONTEXT';
            if (context.board) contextPayload += `\n- Hardware: ${context.board} (${context.deviceType || 'generic'})`;

            if (context.code) {
                // FORCE THE AI INTO AGENTIC MODIFICATION MODE
                contextPayload += `\n- Current Context Code:\n\`\`\`cpp\n${context.code}\n\`\`\``;
                contextPayload += `\n\n⚠️ AGENTIC_MODIFICATION_DIRECTIVE:
                You are the maintainer of this codebase. Act as a real-time AI Agent specialized in SURGICAL EDITS.
                
                YOUR TASKS:
                - INSERTIONS: Add new features or definitions without touching unrelated code.
                - DELETIONS: Remove the specific blocks the user wants gone. Explain what was deleted.
                - REPLACEMENT: Target only the specific lines or variables requested.
                
                RULES:
                1. DO NOT rewrite the entire file. It is inefficient and hard for the user to track.
                2. Use comments like "// [NEW FEATURE]", "// [FIXED]", or "// [REMOVED]" in your snippets to clarify your actions.
                3. Explain the 'Modification Scope' (what you touched and why) before showing any code.
                4. Maintain the overall structure, headers, and comments of the existing project.`;
            }

            if (context.pins?.length) contextPayload += `\n- Pins: ${context.pins.join(', ')}`;

            if ((context as any).telemetry) {
                contextPayload += `\n\n📡 LIVE VEHICLE TELEMETRY:\n${(context as any).telemetry}`;
                contextPayload += `\n\n⚠️ DIAGNOSTIC_DIRECTIVE: 
                Analyze the telemetry above. Look for OBD2 Service 03/07 responses (43/47), 
                ELM327 status codes, and Service 01/09 PID data.
                DTC PRIORITY RULE: If a Diagnostic Trouble Code (DTC) is detected, you MUST 
                print the DTC code itself (e.g. "P0302") in a bold header or large text at the 
                VERY START of your response before any binary decoding or explanation.`;
            }

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
            let parsedError = { message: 'Deep Intel link unstable.' };
            try {
                const json = JSON.parse(errorBody);
                parsedError.message = json.error?.message || json.message || parsedError.message;
            } catch (e) { }

            console.error(`[AI Route] OpenRouter error ${response.status}:`, errorBody);
            return NextResponse.json({
                error: parsedError.message,
                status: response.status
            }, { status: response.status });
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
        return NextResponse.json({ error: 'Autonomous link core failure.' }, { status: 500 });
    }
}

function getDemoResponse(role: ModelRole, message: string): string {
    return "Demo mode is active.";
}
