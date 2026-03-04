import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Loader() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm font-medium">Carregando...</p>
      </div>
    </div>
  );
}

/**
 * allowedTypes: array de user_type permitidos para a rota.
 * Se omitido, qualquer usuário autenticado tem acesso.
 *
 * Exemplos:
 *   <ProtectedRoute allowedTypes={['holding_owner', 'super_admin']}>
 *   <ProtectedRoute allowedTypes={['store_manager']}>
 *   <ProtectedRoute allowedTypes={['disp_compartilhado']}>
 */
export default function ProtectedRoute({ children, allowedTypes }) {
  const { userProfile, userType, loading, getHomeRoute } = useAuth();

  if (loading) return <Loader />;

  // Não autenticado → tela de login
  if (!userProfile) return <Navigate to="/login" replace />;

  // Tipo sem permissão para esta rota → redireciona para tela correta do usuário
  if (allowedTypes && !allowedTypes.includes(userType)) {
    return <Navigate to={getHomeRoute()} replace />;
  }

  return children;
}
