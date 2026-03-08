import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ijexmbrtbbqbxvusiiew.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_sEcEYlFs8X1uzCB4X1ZvjQ_9MiZIdOr";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
