import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { getAuthSession } from '../utils/authStorage';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole: 'USER' | 'ADMIN';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { token, role } = getAuthSession();

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  if (role !== requiredRole) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
