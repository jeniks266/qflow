import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://oltomfcbxuzscjzccpok.supabase.co";

const supabaseAnonKey = "sb_publishable_OCyVzKx85OYKN9W3J7PzJQ_KgXOb3ZW";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);


