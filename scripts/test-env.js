require('dotenv').config({ path: '.env.local' });
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'FOUND' : 'MISSING');
console.log('Supabase Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'FOUND' : 'MISSING');
console.log('API Key:', process.env.OPENROUTER_API_KEY ? 'FOUND' : 'MISSING');
