import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { LOCAL_PROJECTS } from '../src/lib/arduino-knowledge';
import { generateEmbedding } from '../src/lib/vector-utils';

// Initialize Supabase with Service Role Key for migration
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrate() {
    console.log(`🚀 Starting migration of ${LOCAL_PROJECTS.length} projects to Supabase...`);

    for (const project of LOCAL_PROJECTS) {
        try {
            console.log(`\n📦 Processing: ${project.title}...`);

            // 1. Create a rich text representation for the AI to "read"
            const contentString = `
Project Title: ${project.title}
Description: ${project.description}
Pin Mappings: ${project.pins.join(', ')}
Libraries Used: ${project.libraries.join(', ')}
            `.trim();

            // 2. Generate the mathematical vector (embedding)
            console.log(`   🧠 Generating brain embedding...`);
            const embedding = await generateEmbedding(contentString);

            // 3. Store in Supabase
            console.log(`   💾 Saving to Vector Store...`);
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
            console.log(`   ✅ Success!`);

        } catch (err) {
            console.error(`   ❌ Failed to migrate ${project.title}:`, err);
        }

        // Small delay to prevent API rate limiting
        await new Promise(r => setTimeout(r, 200));
    }

    console.log('\n✨ Migration Complete! Circuito AI now has custom project memory.');
}

migrate();
