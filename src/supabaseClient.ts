// FIX: Manually declare the shape of `import.meta.env` to resolve TypeScript errors.
// By augmenting `ImportMetaEnv`, we add our specific environment variables to Vite's
// existing type definitions, which resolves the type conflict.
declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
  }
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be provided in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);