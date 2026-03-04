import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Turns text into a mathematical vector using OpenRouter (OpenAI model)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'liquid/lfm-2.5-1.2b-thinking:free',
            input: text.replace(/\n/g, ' '),
        }),
    });

    const json = await response.json();
    if (!json.data?.[0]?.embedding) {
        console.error('[Vector] Embedding failed:', json);
        throw new Error('Failed to generate embedding');
    }
    return json.data[0].embedding;
}

/**
 * Searches the Supabase vector store for the most relevant hardware facts
 */
export async function searchHardwareKnowledge(query: string, limit = 5) {
    try {
        const embedding = await generateEmbedding(query);

        const { data: documents, error } = await supabase.rpc('match_hardware_knowledge', {
            query_embedding: embedding,
            match_threshold: 0.3, // Pull even loose matches for hardware
            match_count: limit,
        });

        if (error) throw error;
        return documents || [];
    } catch (e) {
        console.error('[Vector] Search error:', e);
        return [];
    }
}
