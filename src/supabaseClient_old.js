import { createClient } from '@supabase/supabase-js'

// TESTE TEMPORÁRIO
const supabaseUrl = 'https://jeuxaiovxfxfbbrnydef.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....0HRs8X4AKfIGwoIiAWJO0mEp8PgtNDALVR6uGY7LA_Q'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)