import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Este é o ponto de falha: se os nomes aqui forem diferentes do Vercel, 
// a variável chega vazia e a tela fica branca.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)