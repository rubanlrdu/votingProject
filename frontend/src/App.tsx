import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import VotingPage from './pages/VotingPage'
import ResultsPage from './pages/ResultsPage'
import UserProfilePage from './pages/UserProfilePage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordFaceVerifyPage from './pages/ResetPasswordFaceVerifyPage'
import ResetPasswordNewPasswordPage from './pages/ResetPasswordNewPasswordPage'
import UserProfileStatus from './components/UserProfileStatus'
import { loadFaceApiModels } from './utils/faceApiHelper'
import './App.css'

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

// Vote route component that requires approval
const VoteRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [profileData, setProfileData] = React.useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = React.useState(true);

  React.useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const checkUserApprovalStatus = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/auth/me', {
          credentials: 'include',
        });
        const data = await response.json();
        setProfileData(data);
      } catch (error) {
        console.error('Error checking user status:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkUserApprovalStatus();
  }, [isAuthenticated, isLoading]);

  if (isLoading || isCheckingStatus) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user?.isAdmin) {
    return <>{children}</>; // Admins can always access
  }

  // Check if face recognition data is enrolled
  const hasFaceDescriptor = profileData?.face_descriptors !== null && profileData?.face_descriptors !== undefined;
  
  if (!profileData || profileData.application_status !== 'Approved') {
    return <Navigate to="/" />;
  }
  
  // If face recognition is mandatory but not enrolled, redirect to profile
  if (!hasFaceDescriptor) {
    return <Navigate to="/profile" />;
  }

  return <>{children}</>;
};

// Admin route component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  console.log('AdminRoute - User:', user);
  console.log('AdminRoute - Is Loading:', isLoading);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user?.isAdmin) {
    console.log('AdminRoute - Redirecting to home, user is not admin');
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

// Simplified AppContent component without unused variables
const AppContent: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/results">Results</Link>
          {user ? (
            <>
              {user.isAdmin && <Link to="/admin">Admin</Link>}
              <Link to="/profile">My Profile</Link>
              <button onClick={logout} className="logout-button">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </nav>

      {user && !user.isAdmin && (
        <div className="main-container">
          <UserProfileStatus />
        </div>
      )}

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div className="main-container">
                <div className="content-container">
                  <h1>Welcome, {user?.username}!</h1>
                  {user && !user.isAdmin && (
                    <p className="vote-instruction">
                      {user.has_voted ? 
                        "Thank you for voting!" : 
                        "You can cast your vote when you're ready."}
                    </p>
                  )}
                </div>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vote"
          element={
            <VoteRoute>
              <VotingPage />
            </VoteRoute>
          }
        />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  const [, setModelsLoaded] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  useEffect(() => {
    const initializeFaceApi = async () => {
      try {
        await loadFaceApiModels();
        setModelsLoaded(true);
      } catch (error) {
        console.error('Failed to load face-api models:', error);
        setModelError('Failed to load face recognition models. Some features may not work correctly.');
      }
    };

    initializeFaceApi();
  }, []);

  return (
    <AuthProvider>
      <Router>
        {modelError && (
          <div className="model-error-banner" style={{ background: '#ffcccc', padding: '10px', textAlign: 'center' }}>
            {modelError}
          </div>
        )}
        <Routes>
          <Route path="*" element={
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          } />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/face-verify" element={<ResetPasswordFaceVerifyPage />} />
          <Route path="/reset-password/new-password" element={<ResetPasswordNewPasswordPage />} />
          <Route path="/profile" element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          } />
          <Route path="/vote" element={
            <VoteRoute>
              <VotingPage />
            </VoteRoute>
          } />
          <Route path="/results" element={
            <ProtectedRoute>
              <ResultsPage />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App
