import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function ProtectedRoute({ children, role }) {
  const storeToken = useAuthStore((s) => s.token);
  const storeRole = useAuthStore((s) => s.role);
  const token = localStorage.getItem('jansetu_token') || storeToken;
  const activeRole = localStorage.getItem('jansetu_role') || storeRole;

  if (!token && !activeRole) {
    if (role === 'officer') {
      return <Navigate to="/officer/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // admin can access officer routes; officer and citizen are mutually exclusive
  const allowed =
    activeRole === role ||
    (role === 'officer' && activeRole === 'admin');

  if (!allowed) {
    return <Navigate to={activeRole === 'officer' || activeRole === 'admin' ? '/officer' : '/citizen'} replace />;
  }

  return children;
}
