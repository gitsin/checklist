import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function setOrgHeader(orgId) {
  if (orgId) {
    supabase.rest.headers['x-org-id'] = orgId;
  } else {
    delete supabase.rest.headers['x-org-id'];
  }
}