import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Layout from './Layout.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedLayout() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner label="Preparing your workspace..." />
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/auth" replace state={{ redirectTo: location.pathname + location.search }} />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
