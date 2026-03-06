require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Load the projects from the TS file by parsing it or using the existing arduino-knowledge file if possible.
// Since we have the file, let's just use the data we know is there.
const { LOCAL_PROJECTS } = require('../src/lib/arduino-knowledge.ts');
// Wait, Node can't require .ts. Let's just manually define the OBD2 entry we just added.

const obd2Project = {
    id: "obd2_can_traffic_log",
    title: "OBD2 CAN Traffic Log (canid.pdf)",
    description: "Raw OBD2 CAN bus traffic data log. Contains periodic messages and state changes for various vehicle control units. Frequent IDs: 0x545 (Engine/Status), 0x350 (ABS/Steering), 0x316 (Engine RPM/Speed), 0x4F0 (Lighting/BCM), and 0x329. This dataset is used for reverse engineering vehicle-specific PID controllers and understanding bus load.",
    pins: ["CAN_RX=4", "CAN_TX=5"],
    libraries: ["ESP32-TWAI-CAN", "mcp_can.h"]
};

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateEmbedding(text) {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'openai/text-embedding-3-small',
            input: text.replace(/\n/g, ' '),
        }),
    });

    const json = await response.json();
    return json.data[0].embedding;
}

async function migrateSingle() {
    console.log(`🚀 Migrating OBD2 Data to Supabase...`);
    const project = obd2Project;

    const contentString = `
Project Title: ${project.title}
Description: ${project.description}
Pin Mappings: ${project.pins.join(', ')}
Libraries Used: ${project.libraries.join(', ')}
    `.trim();

    try {
        const embedding = await generateEmbedding(contentString);
        const { error } = await supabase
            .from('hardware_knowledge')
            .upsert({
                title: project.title,
                content: contentString,
                metadata: {
                    id: project.id,
                    pins: project.pins,
                    libraries: project.libraries
                },
                embedding: embedding
            }, { onConflict: 'title' });

        if (error) throw error;
        console.log(`✅ OBD2 Logic Integrated!`);
    } catch (e) {
        console.error(`❌ Migration failed:`, e);
    }
}

migrateSingle();
