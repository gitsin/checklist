import { createClient } from '@supabase/supabase-js'

// TESTE TEMPORÁRIO
const supabaseUrl = 'https://jeuxaiovxfxfbbrnydef.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpldXhhaW92eGZ4ZmJicm55ZGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1Mzk2NjQsImV4cCI6MjA4MTExNTY2NH0.0HRs8X4AKfIGwoIiAWJO0mEp8PgtNDALVR6uGY7LA_Q'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)