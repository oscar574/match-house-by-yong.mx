import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const AccessDenied = () => {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 flex items-center justify-center px-6 bg-background">
      <div className="text-center max-w-sm">
        <h1 className="font-heading text-xl text-foreground mb-2">Acceso denegado</h1>
        <p className="text-sm text-muted-foreground mb-6">No tienes permisos para acceder a esta sección.</p>
        <button onClick={() => navigate('/discover', { replace: true })} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
          Volver al inicio
        </button>
      </div>
    </div>
  );
};

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement, requiredRole }) {
  const { user, isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <AccessDenied />;
  }

  return <Outlet />;
}