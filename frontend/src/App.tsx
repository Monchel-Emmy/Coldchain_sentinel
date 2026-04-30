import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import GlobalLoader from './components/GlobalLoader';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import HealthCenters from './pages/Centrales';
import Fridges from './pages/Frigos';
import Devices from './pages/Devices';
import Vaccines from './pages/Vaccines';
import Monitoring from './pages/Monitoring';
import Alerts from './pages/Alerts';
import Predictions from './pages/Predictions';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Settings from './pages/Settings';
import { Thermometer } from 'lucide-react';

// Guard that redirects to /login if not authenticated
function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Thermometer size={22} className="text-white" />
          </div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"         element={<Login />} />
      <Route path="/signup"        element={<Signup />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route element={<RequireAuth />}>
        <Route path="/"               element={<Dashboard />} />
        <Route path="/health-centers" element={<HealthCenters />} />
        <Route path="/fridges"        element={<Fridges />} />
        <Route path="/devices"        element={<Devices />} />
        <Route path="/vaccines"       element={<Vaccines />} />
        <Route path="/monitoring"     element={<Monitoring />} />
        <Route path="/alerts"         element={<Alerts />} />
        <Route path="/predictions"    element={<Predictions />} />
        <Route path="/reports"        element={<Reports />} />
        <Route path="/users"          element={<Users />} />
        <Route path="/roles"          element={<Roles />} />
        <Route path="/settings"       element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LoadingProvider>
      <AuthProvider>
        <GlobalLoader />
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </LoadingProvider>
  );
}
