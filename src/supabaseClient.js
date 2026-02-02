import { createClient } from '@supabase/supabase-js'

// TESTE TEMPORÁRIO
const supabaseUrl = 'https://jeuxaiovxfxfbbrnydef.supabase.co'
const supabaseAnonKey = 'sua-sb_secret_u2mPSVjZhIa_10tIzxnkSg_czgXiuFk-real-aqui'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)