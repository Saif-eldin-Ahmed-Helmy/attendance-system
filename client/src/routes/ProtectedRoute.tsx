import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { useAuthContext } from '../context/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingComponents';

interface ProtectedRouteProps {
  role?: string;
  navigateTo?: string;
  isAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  role,
  navigateTo = '/login',
  isAuth = true
}) => {
  const { user, loading, isAuthenticated } = useAuthContext();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-3 text-muted">Checking authentication...</p>
        </div>
      </Container>
    );
  }

  // Check if user should be authenticated for this route
  if (isAuth && !isAuthenticated) {
    return <Navigate to={navigateTo} replace />;
  }

  // Check if user should NOT be authenticated for this route (like login page)
  if (!isAuth && isAuthenticated) {
    return <Navigate to={navigateTo} replace />;
  }

  // Check role-based access
  if (role && user) {
    const hasAccess = checkRoleAccess(user.role, role);
    if (!hasAccess) {
      // Redirect to appropriate page based on user role
      const redirectPath = getRedirectPath(user.role);
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <Outlet />;
};

/**
 * Check if user role has access to the required role
 */
const checkRoleAccess = (userRole: string, requiredRole: string): boolean => {
  // Define role hierarchy and permissions
  const roleHierarchy = {
    'admin': ['admin', 'management', 'doctor', 'teaching assistant', 'student'],
    'management': ['management', 'doctor', 'teaching assistant'],
    'doctor': ['doctor'],
    'teaching assistant': ['teaching assistant'],
    'student': ['student']
  };

  const allowedRoles = roleHierarchy[userRole as keyof typeof roleHierarchy] || [];
  return allowedRoles.includes(requiredRole);
};

/**
 * Get appropriate redirect path based on user role
 */
const getRedirectPath = (userRole: string): string => {
  switch (userRole) {
    case 'admin':
    case 'management':
      return '/subjects';
    case 'doctor':
    case 'teaching assistant':
      return '/subjects';
    case 'student':
      return '/announcements';
    default:
      return '/subjects';
  }
};

export default ProtectedRoute;