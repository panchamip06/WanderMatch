import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './services/auth';
import { ApiService } from './services/api';
import { Navbar } from './components/Navbar';
import { LandingPage } from './screens/LandingPage';
import { LoginPage } from './screens/LoginPage';
import { RegisterPage } from './screens/RegisterPage';
import { DashboardScreen } from './screens/DashboardScreen';
import { CreateTripPage } from './screens/CreateTripPage';
import { JoinTripPage } from './screens/JoinTripPage';
import { FindTripPage } from './screens/FindTripPage';
import { TripHomeScreen } from './screens/TripHomeScreen';
import { SlotDetailScreen } from './screens/SlotDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';

// Phase 1-2 prototype screens preserved for full backward compatibility
import { BranchViewScreen } from './screens/BranchViewScreen';
import { TripChatScreen } from './screens/TripChatScreen';
import { SoloMatchScreen } from './screens/SoloMatchScreen';
import { FaceRegistrationScreen } from './screens/FaceRegistrationScreen';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-400">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const MainLayout: React.FC = () => {
  const [backendOnline, setBackendOnline] = useState<boolean>(false);

  useEffect(() => {
    ApiService.checkHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));

    const interval = setInterval(() => {
      ApiService.checkHealth()
        .then(() => setBackendOnline(true))
        .catch(() => setBackendOnline(false));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <Navbar backendOnline={backendOnline} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Authenticated Real Application Journey */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <DashboardScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/new"
            element={
              <ProtectedRoute>
                <CreateTripPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/join"
            element={
              <ProtectedRoute>
                <JoinTripPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/find"
            element={
              <ProtectedRoute>
                <FindTripPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:tripId"
            element={
              <ProtectedRoute>
                <TripHomeScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:tripId/slots/:slotId"
            element={
              <ProtectedRoute>
                <SlotDetailScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileScreen />
              </ProtectedRoute>
            }
          />

          {/* Preserved prototype screens */}
          <Route
            path="/branch-view"
            element={
              <ProtectedRoute>
                <BranchViewScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <TripChatScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/solo-match"
            element={
              <ProtectedRoute>
                <SoloMatchScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/face-reg"
            element={
              <ProtectedRoute>
                <FaceRegistrationScreen />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        WanderMatch · KogniVera Hackathon 2026 · PS-11 Real Architecture
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
