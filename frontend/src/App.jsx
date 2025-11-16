import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from "./pages/VerifyEmail";
import CounsellorRegistration from './pages/CounsellorRegistration';
import TherapistDirectory from './pages/TherapistDirectory';
import ClientDashboard from './pages/ClientDashboard';
import BookAppointment from './pages/BookAppointment';
import CounsellorDashboard from './pages/CounsellorDashboard';
import Resources from './pages/Resources';
import Footer from './components/Footer';
import ClientProfile from './pages/ClientProfile';
import CounsellorProfile from './pages/CounsellorProfile';
import ManageSlots from './pages/ManageSlots';
import MyAppointments from './pages/MyAppointments';
import EarningsSummary from './pages/EarningsSummary';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

function ProtectedRoute({ children, requireCounsellor = false }) {
  // Lazy import to avoid circular deps
  // const { useAuth } = require('./context/AuthContext.jsx');
  const { isAuthenticated, userType } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requireCounsellor && userType !== 'counsellor') 
    return <Navigate to="/dashboard" replace />;
  return children;
}

function NotFound() {
  return (
    <div className="container-responsive py-20 text-center">
      <h1 className="text-3xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-gray-600">The page you are looking for does not exist.</p>
      <a href="/" className="mt-6 inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Go Home</a>
    </div>
  );
}

const App = () => {
  return (
    <AuthProvider>
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            
            <Route path="/register/counsellor" element={<CounsellorRegistration />} />
            <Route path="/therapists" element={<TherapistDirectory />} />
            <Route path="/dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
            <Route path="/appointments/book" element={<ProtectedRoute><BookAppointment /></ProtectedRoute>} />
            <Route path="/counsellor/dashboard" element={<ProtectedRoute requireCounsellor><CounsellorDashboard /></ProtectedRoute>} />
            <Route path="/counsellor/profile" element={<ProtectedRoute requireCounsellor><CounsellorProfile /></ProtectedRoute>} />
            <Route path="/counsellor/manage-slots" element={<ProtectedRoute requireCounsellor><ManageSlots /></ProtectedRoute>} />
            <Route path="/counsellor/appointments" element={<ProtectedRoute requireCounsellor><MyAppointments /></ProtectedRoute>} />
            <Route path="/counsellor/earnings" element={<ProtectedRoute requireCounsellor><EarningsSummary /></ProtectedRoute>} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/profile" element={<ProtectedRoute><ClientProfile /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
            {/* <Route path="/dashboard" element={<ClientDashboard />} />
            <Route path="/appointments/book" element={<BookAppointment />} />
            <Route path="/counsellor/dashboard" element={<CounsellorDashboard />} />
            <Route path="/counsellor/profile" element={<CounsellorProfile />} />
            <Route path="/counsellor/manage-slots" element={<ManageSlots />} />
            <Route path="/counsellor/appointments" element={<MyAppointments />} />
            <Route path="/counsellor/earnings" element={<EarningsSummary />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/profile" element={<ClientProfile />} /> */}
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
    </AuthProvider>
  );
};

export default App;
