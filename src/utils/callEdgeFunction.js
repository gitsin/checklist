import { supabase } from '../supabaseClient';

export async function callEdgeFunction(name, body) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');

  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );
  let data;
  try {
    data = await resp.json();
  } catch {
    throw new Error(`Erro de comunicação com o servidor (${resp.status})`);
  }
  if (!resp.ok) throw new Error(data.error || data.message || `Erro na operação (${resp.status})`);
  return data;
}
