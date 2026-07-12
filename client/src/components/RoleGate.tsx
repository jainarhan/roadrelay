import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from 'shared';

interface RoleGateProps {
  roles: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Inline gate to hide/show UI components
export const RoleGate: React.FC<RoleGateProps> = ({ roles, children, fallback = null }) => {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface ProtectedRouteProps {
  roles?: Role[];
  children: React.ReactNode;
}

// Page-level route protection that redirects appropriately
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ roles, children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <span className="text-gray-600 font-medium">Loading session...</span>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page and save target location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Redirect to unauthorized if role is not allowed
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
