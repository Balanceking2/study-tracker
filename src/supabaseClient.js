import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qnmhtjebaclecldnrtqm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FbaBoB7Pk2DoJ7svYdTeFA_AUSwS...'; // Replace with your full publishable key from Supabase

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
