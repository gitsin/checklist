import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      // Se não marcou "manter conectado", limpar sessão ao reabrir navegador
      if (s && !localStorage.getItem('rememberMe') && !sessionStorage.getItem('sessionActive')) {
        supabase.auth.signOut();
        setLoading(false);
        return;
      }
      setSession(s);
      if (s) {
        sessionStorage.setItem('sessionActive', '1');
        fetchAdminProfile(s.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
        setSession(s);
        setLoading(false);
        return;
      }

      setSession(s);
      if (s) {
        sessionStorage.setItem('sessionActive', '1');
        fetchAdminProfile(s.user.id);
      } else {
        setAdminUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchAdminProfile(authUserId) {
    const { data } = await supabase
      .from('admin_users')
      .select('*, organization:organizations(id, name, slug, logo_url)')
      .eq('auth_user_id', authUserId)
      .eq('active', true)
      .single();

    setAdminUser(data || null);
    setLoading(false);
  }

  async function signIn(email, password, rememberMe = false) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (rememberMe) {
      localStorage.setItem('rememberMe', '1');
    } else {
      localStorage.removeItem('rememberMe');
    }
    sessionStorage.setItem('sessionActive', '1');

    return data;
  }

  async function signOut() {
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('sessionActive');
    await supabase.auth.signOut();
    setSession(null);
    setAdminUser(null);
    setPasswordRecovery(false);
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

  const value = {
    session,
    adminUser,
    loading,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    passwordRecovery,
    orgId: adminUser?.organization_id || null,
    orgName: adminUser?.organization?.name || null,
    isSuperAdmin: adminUser?.role === 'super_admin',
    isHoldingOwner: adminUser?.role === 'holding_owner',
    isGroupDirector: adminUser?.role === 'group_director',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
