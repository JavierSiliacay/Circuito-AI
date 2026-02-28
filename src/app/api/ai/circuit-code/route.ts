import { NextRequest, NextResponse } from 'next/server';

// ==============================================================
// Circuito AI — Circuit-to-Code Generator
// ==============================================================
// This route analyzes nodes and edges from the ReactFlow circuit
// builder and generates a fully commented Arduino/ESP32 sketch
// with correct pin assignments, libraries, and best practices.
// ==============================================================

const SYSTEM_PROMPT = `You are Circuito AI's Code Architect. You receive a JSON description of a circuit diagram and you generate a complete, compilable Arduino/ESP32 C++ sketch.

RULES:
1. Analyze the provided components (nodes) and their connections (edges) carefully.
2. Assign GPIO pins logically based on the MCU type (ESP32 or Arduino Uno).
3. Include all required #include statements for specialized components.
4. Add detailed comments explaining each section.
5. Use #define for all pin assignments at the top.
6. Use setup() and loop() correctly.
7. For sensors, generate example reading code with Serial output.
8. For outputs (LED, Buzzer, Motor), generate control code with visual feedback.
9. Use millis() instead of delay() when possible for non-blocking behavior.
10. Add a "System Initialized" Serial message in setup().
11. Default baud rate is 115200.
12. Output ONLY the C++ code, no explanations or markdown. Just raw code.

PIN ASSIGNMENT GUIDELINES:
- ESP32: Use GPIO 2 (onboard LED), 4, 5, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33
- Arduino Uno: Use pins 2-13 for digital, A0-A5 for analog
- Avoid pin 0 and 1 (Serial TX/RX)
- For I2C devices: ESP32 uses GPIO 21 (SDA), 22 (SCL); Arduino uses A4 (SDA), A5 (SCL)
- For PWM (motors, dimmable LEDs): ESP32 can use any GPIO; Arduino use 3, 5, 6, 9, 10, 11

COMPONENT HANDLING:
- LED → digitalWrite or analogWrite for dimming
- Sensor → analogRead or digital library (DHT, BME280, etc.)
- Buzzer → tone() function
- Motor → analogWrite with optional direction pin
- Battery → No code needed, just a comment about power source
- Resistor → No code needed, just comment the value`;

export async function POST(req: NextRequest) {
    try {
        const { nodes, edges, boardType } = await req.json();

        if (!nodes || nodes.length === 0) {
            return NextResponse.json({ error: 'No components found on the canvas' }, { status: 400 });
        }

        // Build a human-readable circuit description from nodes/edges
        const circuitDescription = buildCircuitDescription(nodes, edges, boardType);

        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            // Demo mode — generate a smart default sketch
            const code = generateDemoCode(nodes, edges, boardType);
            return NextResponse.json({ code });
        }

        // Live AI generation
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
                'X-Title': 'Circuito AI',
            },
            body: JSON.stringify({
                model: 'arcee-ai/trinity-large-preview:free',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: circuitDescription },
                ],
                max_tokens: 2048,
                temperature: 0.3,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('OpenRouter error:', error);
            // Fallback to demo code
            const code = generateDemoCode(nodes, edges, boardType);
            return NextResponse.json({ code });
        }

        const data = await response.json();
        let code = data.choices?.[0]?.message?.content || '';

        // Clean up markdown code blocks if AI wrapped it
        code = code.replace(/```cpp\n?/g, '').replace(/```c\n?/g, '').replace(/```\n?/g, '').trim();

        return NextResponse.json({ code });
    } catch (err: any) {
        console.error('Code generation error:', err);
        return NextResponse.json({ error: 'Code generation failed', details: err.message }, { status: 500 });
    }
}

function buildCircuitDescription(nodes: any[], edges: any[], boardType?: string): string {
    const mcuNodes = nodes.filter((n: any) => n.type === 'mcu');
    const componentNodes = nodes.filter((n: any) => n.type === 'component');

    let description = `Generate Arduino C++ code for the following circuit:\n\n`;
    description += `MCU: ${mcuNodes.map((n: any) => n.data.label).join(', ') || boardType || 'ESP32'}\n\n`;
    description += `Components:\n`;

    componentNodes.forEach((node: any, i: number) => {
        const connections = edges.filter((e: any) => e.source === node.id || e.target === node.id);
        const connectedTo = connections.map((e: any) => {
            const otherId = e.source === node.id ? e.target : e.source;
            const otherNode = nodes.find((n: any) => n.id === otherId);
            return otherNode?.data.label || otherId;
        });

        description += `${i + 1}. ${node.data.label}`;
        if (connectedTo.length > 0) {
            description += ` (connected to: ${connectedTo.join(', ')})`;
        }
        description += `\n`;
    });

    description += `\nConnections:\n`;
    edges.forEach((edge: any) => {
        const source = nodes.find((n: any) => n.id === edge.source);
        const target = nodes.find((n: any) => n.id === edge.target);
        description += `- ${source?.data.label || edge.source} → ${target?.data.label || edge.target}\n`;
    });

    return description;
}

function generateDemoCode(nodes: any[], edges: any[], boardType?: string): string {
    const mcuNodes = nodes.filter((n: any) => n.type === 'mcu');
    const componentNodes = nodes.filter((n: any) => n.type === 'component');

    const mcuName = mcuNodes[0]?.data.label || boardType || 'ESP32';
    const isESP32 = mcuName.toLowerCase().includes('esp32');

    // Assign pins intelligently
    const espPins = [2, 4, 5, 13, 15, 16, 17, 18, 19, 23, 25, 26, 27];
    const unoPins = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const pins = isESP32 ? espPins : unoPins;
    let pinIndex = 0;

    const defines: string[] = [];
    const setupLines: string[] = [];
    const loopLines: string[] = [];
    const globalVars: string[] = [];

    componentNodes.forEach((node: any) => {
        const name = node.data.label;
        const pin = pins[pinIndex++ % pins.length];
        const safeName = name.toUpperCase().replace(/\s+/g, '_');

        switch (name.toLowerCase()) {
            case 'led':
                defines.push(`#define ${safeName}_PIN ${pin}`);
                setupLines.push(`  pinMode(${safeName}_PIN, OUTPUT);`);
                loopLines.push(`  // Blink ${name}`);
                loopLines.push(`  digitalWrite(${safeName}_PIN, HIGH);`);
                loopLines.push(`  delay(500);`);
                loopLines.push(`  digitalWrite(${safeName}_PIN, LOW);`);
                loopLines.push(`  delay(500);`);
                break;
            case 'sensor':
                defines.push(`#define ${safeName}_PIN ${isESP32 ? 32 : 'A0'}`);
                setupLines.push(`  pinMode(${safeName}_PIN, INPUT);`);
                loopLines.push(`  // Read ${name}`);
                loopLines.push(`  int ${safeName.toLowerCase()}Value = analogRead(${safeName}_PIN);`);
                loopLines.push(`  Serial.print("${name}: ");`);
                loopLines.push(`  Serial.println(${safeName.toLowerCase()}Value);`);
                break;
            case 'buzzer':
                defines.push(`#define ${safeName}_PIN ${pin}`);
                setupLines.push(`  pinMode(${safeName}_PIN, OUTPUT);`);
                loopLines.push(`  // Play tone on ${name}`);
                loopLines.push(`  tone(${safeName}_PIN, 1000, 200);`);
                loopLines.push(`  delay(500);`);
                break;
            case 'motor':
                defines.push(`#define ${safeName}_PIN ${pin}`);
                setupLines.push(`  pinMode(${safeName}_PIN, OUTPUT);`);
                loopLines.push(`  // Run ${name} at 75% speed`);
                loopLines.push(`  analogWrite(${safeName}_PIN, 192);`);
                loopLines.push(`  delay(2000);`);
                loopLines.push(`  analogWrite(${safeName}_PIN, 0);`);
                loopLines.push(`  delay(1000);`);
                break;
            case 'resistor':
                loopLines.push(`  // ${name}: Pull-up/down or current limiting in circuit`);
                break;
            case 'battery':
                loopLines.push(`  // ${name}: External power source`);
                break;
            default:
                defines.push(`#define ${safeName}_PIN ${pin}`);
                setupLines.push(`  pinMode(${safeName}_PIN, INPUT);`);
                loopLines.push(`  // Read ${name}`);
                loopLines.push(`  int ${safeName.toLowerCase()}State = digitalRead(${safeName}_PIN);`);
                loopLines.push(`  Serial.print("${name}: ");`);
                loopLines.push(`  Serial.println(${safeName.toLowerCase()}State);`);
        }
    });

    // Build the final sketch
    let code = `// ============================================\n`;
    code += `// Generated by Circuito AI — Circuit-to-Code\n`;
    code += `// Board: ${mcuName}\n`;
    code += `// Components: ${componentNodes.map((n: any) => n.data.label).join(', ')}\n`;
    code += `// ============================================\n\n`;

    if (defines.length > 0) {
        code += `// Pin Definitions\n`;
        code += defines.join('\n') + '\n\n';
    }

    if (globalVars.length > 0) {
        code += globalVars.join('\n') + '\n\n';
    }

    code += `void setup() {\n`;
    code += `  Serial.begin(115200);\n`;
    code += `  Serial.println("=== Circuito AI - System Initialized ===");\n`;
    code += `  Serial.println("Board: ${mcuName}");\n`;
    if (setupLines.length > 0) {
        code += `\n  // Initialize components\n`;
        code += setupLines.join('\n') + '\n';
    }
    code += `}\n\n`;

    code += `void loop() {\n`;
    if (loopLines.length > 0) {
        code += loopLines.join('\n') + '\n';
    } else {
        code += `  // No components detected — add components to your circuit!\n`;
        code += `  delay(1000);\n`;
    }
    code += `}\n`;

    return code;
}
