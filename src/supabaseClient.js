import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Este é o ponto de falha: se os nomes aqui forem diferentes do Vercel, 
// a variável chega vazia e a tela fica branca.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)