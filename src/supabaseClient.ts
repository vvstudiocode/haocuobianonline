// FIX: The triple-slash reference to "vite/client" was causing a "Cannot find type definition file" error.
// This is likely due to a misconfiguration in the TypeScript environment. Removing the reference and casting `import.meta`
// to `any` resolves the type errors, allowing access to Vite environment variables at runtime.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be provided in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);