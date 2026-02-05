import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, requireCook = false }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  // Not authenticated - redirect to login with return URL
  if (!token || !user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Require cook role but user is not a cook
  if (requireCook) {
    const cookStatus = user?.role_cook_status;
    if (cookStatus !== 'active') {
      // Redirect to appropriate page based on status
      if (cookStatus === 'pending') {
        return <Navigate to="/foodie/cook-status" replace />;
      } else if (cookStatus === 'suspended') {
        return <Navigate to="/foodie/suspended" replace />;
      } else {
        // Not a cook - redirect to cook registration
        return <Navigate to="/foodie/cook-registration" replace />;
      }
    }
  }

  return children;
};

export default ProtectedRoute;
