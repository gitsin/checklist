import { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, setOrgHeader } from '../supabaseClient';

const KioskContext = createContext(null);

export function KioskProvider({ children }) {
  const { orgSlug } = useParams();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(!!orgSlug);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orgSlug) {
      resolveOrg(orgSlug);
    }
  }, [orgSlug]);

  async function resolveOrg(slug) {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('organizations')
      .select('id, name, slug, logo_url')
      .eq('slug', slug)
      .eq('active', true)
      .single();

    if (err || !data) {
      setError('Organização não encontrada');
      setOrganization(null);
    } else {
      setOrganization(data);
      setOrgHeader(data.id);
    }

    setLoading(false);
  }

  const value = {
    organization,
    orgId: organization?.id || null,
    orgSlug: orgSlug || null,
    loading,
    error,
  };

  return <KioskContext.Provider value={value}>{children}</KioskContext.Provider>;
}

export function useKiosk() {
  const context = useContext(KioskContext);
  if (!context) throw new Error('useKiosk deve ser usado dentro de KioskProvider');
  return context;
}
