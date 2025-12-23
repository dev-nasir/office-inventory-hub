
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = (url: string) => {
  try {
    return new URL(url).protocol.startsWith('http');
  } catch {
    return false;
  }
};

const isValidSetup = supabaseUrl && isValidUrl(supabaseUrl) && supabaseAnonKey;

if (!isValidSetup) {
  console.error('CRITICAL: Supabase configuration is missing or invalid.');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.');
  console.error('Current URL:', supabaseUrl);
}

// Prevent crash by using a fallback if invalid. 
// This allows the app to load so the user can see the problem, rather than a blank white screen.
export const supabase = createClient(
  isValidSetup ? supabaseUrl : 'https://placeholder.supabase.co', 
  isValidSetup ? supabaseAnonKey : 'placeholder'
);
