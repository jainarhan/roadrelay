import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/RoleGate';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Vehicles } from './pages/Vehicles';
import { Drivers } from './pages/Drivers';
import { Trips } from './pages/Trips';
import { Maintenance } from './pages/Maintenance';
import { Unauthorized } from './pages/Unauthorized';
import {
  FuelExpensesPlaceholder,
  ReportsPlaceholder,
} from './pages/Placeholders';

const queryClient = new QueryClient();

// Main Layout wrapping the sidebar and content area
const Layout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

// Simple helper component to redirect logged in users away from the login page
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <span className="text-gray-600 font-medium">Loading session...</span>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* Protected Routes sharing layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              
              <Route
                path="/vehicles"
                element={
                  <ProtectedRoute roles={['FLEET_MANAGER']}>
                    <Vehicles />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/drivers"
                element={
                  <ProtectedRoute roles={['FLEET_MANAGER', 'SAFETY_OFFICER']}>
                    <Drivers />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/trips"
                element={
                  <ProtectedRoute roles={['FLEET_MANAGER']}>
                    <Trips />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/maintenance"
                element={
                  <ProtectedRoute roles={['FLEET_MANAGER', 'SAFETY_OFFICER']}>
                    <Maintenance />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/fuel-expenses"
                element={
                  <ProtectedRoute roles={['FLEET_MANAGER', 'FINANCIAL_ANALYST']}>
                    <FuelExpensesPlaceholder />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports"
                element={
                  <ProtectedRoute roles={['FLEET_MANAGER', 'FINANCIAL_ANALYST']}>
                    <ReportsPlaceholder />
                  </ProtectedRoute>
                }
              />

              <Route path="/unauthorized" element={<Unauthorized />} />
            </Route>

            {/* Wildcard fallback redirects to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
