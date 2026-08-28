// ============================================================
// Milenium Gym — supabaseClient.js
// Instancia única del cliente de Supabase. Se importa el SDK
// como ESM directo desde CDN: no hay bundler ni build en este
// proyecto, así que no tiene sentido instalarlo por npm.
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
