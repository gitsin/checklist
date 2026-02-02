import { createClient } from '@supabase/supabase-js'

// TESTE TEMPORÁRIO
const supabaseUrl = 'https://jeuxaiovxfxfbbrnydef.supabase.co'
const supabaseAnonKey = 'sb_secret_Mzz3l0gkwEvyvKI9c4QZQw_fGK9OMVn'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)