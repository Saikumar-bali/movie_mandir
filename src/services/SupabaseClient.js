import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { ENV } from '../config/env';

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false, // We aren't doing complex auth for now
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
});
