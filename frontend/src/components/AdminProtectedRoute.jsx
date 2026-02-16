import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Layout } from './Layout';

const AdminProtectedRoute = ({ children }) => {
  const { user, isAdmin, loading } = useUser();

  if (loading) {
    return <Layout loading={true} />;
  }

  // Check if user is logged in AND is admin
  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default AdminProtectedRoute;