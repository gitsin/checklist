import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, setOrgHeader } from '../supabaseClient';

const AuthContext = createContext(null);

// ─── Mapa de destino por tipo de usuário ──────────────────────────────────────
function getHomeRoute(userType, storeId) {
  switch (userType) {
    case 'super_admin':        return '/admin';
    case 'holding_owner':      return '/admin';
    case 'group_director':     return '/admin';
    case 'store_manager':      return '/gerente';
    case 'disp_compartilhado': return `/kiosk/${storeId}`;
    case 'colaborador':        return '/login'; // usa kiosk público por enquanto
    default:                   return '/login';
  }
}

export function AuthProvider({ children }) {
  const [session, setSession]             = useState(null);
  const [userProfile, setUserProfile]     = useState(null);
  const [loading, setLoading]             = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const signingInRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
        setSession(s);
        setLoading(false);
        return;
      }

      if (event === 'INITIAL_SESSION') {
        if (s && !localStorage.getItem('rememberMe') && !sessionStorage.getItem('sessionActive')) {
          // Descarta estado imediatamente sem aguardar o signOut
          // (awaitar signOut dentro do onAuthStateChange causa deadlock de callbacks)
          setSession(null);
          setUserProfile(null);
          setOrgHeader(null);
          setLoading(false);
          supabase.auth.signOut({ scope: 'local' }); // fire-and-forget: limpa o token do localStorage
          return;
        }
        setSession(s);
        if (s) {
          sessionStorage.setItem('sessionActive', '1');
          await fetchUserProfile(s.user.id);
        } else {
          setLoading(false);
        }
        return;
      }

      if (event === 'SIGNED_IN' && signingInRef.current) {
        setSession(s);
        return;
      }

      setSession(s);
      if (s) {
        await fetchUserProfile(s.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserProfile(authUserId) {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select(`
          *,
          organization:organizations(id, name, slug, logo_url),
          store:stores(id, name, shortName),
          group:restaurant_groups(id, name),
          role:roles(id, name, slug)
        `)
        .eq('auth_user_id', authUserId)
        .eq('active', true)
        .single();

      setUserProfile(data || null);
      setOrgHeader(data?.organization_id || null);

      if (!data) {
        // Token existe no Supabase Auth mas sem profile correspondente:
        // limpa sessão local para evitar tela de loading travada no próximo acesso
        setSession(null);
        supabase.auth.signOut({ scope: 'local' });
      }
    } catch {
      setUserProfile(null);
      setOrgHeader(null);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email, password, rememberMe = false) {
    signingInRef.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (rememberMe) {
        localStorage.setItem('rememberMe', '1');
      } else {
        localStorage.removeItem('rememberMe');
      }
      sessionStorage.setItem('sessionActive', '1');

      setSession(data.session);
      await fetchUserProfile(data.user.id);
      return data;
    } finally {
      signingInRef.current = false;
    }
  }

  async function signOut() {
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('sessionActive');
    try {
      await supabase.auth.signOut();
    } catch {
      // Se a chamada ao servidor falhar, remove o token local manualmente
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      }
    } finally {
      setOrgHeader(null);
      setSession(null);
      setUserProfile(null);
      setPasswordRecovery(false);
    }
  }

  async function resetPassword(email) {
    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setPasswordRecovery(false);
  }

  const userType = userProfile?.user_type || null;

  const value = {
    session,
    userProfile,
    loading,
    passwordRecovery,
    // Tipo e escopos
    userType,
    orgId:   userProfile?.organization_id || null,
    groupId: userProfile?.restaurant_group_id || null,
    storeId: userProfile?.store_id || null,
    // Helpers de role (para ProtectedRoute e UI)
    isSuperAdmin:       userType === 'super_admin',
    isHoldingOwner:     userType === 'holding_owner',
    isGroupDirector:    userType === 'group_director',
    isStoreManager:     userType === 'store_manager',
    isDispCompartilhado: userType === 'disp_compartilhado',
    isColaborador:      userType === 'colaborador',
    // Compatibilidade com código admin legado
    adminUser: userProfile,
    isSuperAdmin_legacy: userType === 'super_admin',
    isHoldingOwner_legacy: userType === 'holding_owner',
    orgName: userProfile?.organization?.name || null,
    // Rota correta pós-login
    getHomeRoute: () => getHomeRoute(userType, userProfile?.store_id),
    // Ações
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
