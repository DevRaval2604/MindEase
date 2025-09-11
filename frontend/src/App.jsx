import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
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

const App = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/counsellor" element={<CounsellorRegistration />} />
            <Route path="/therapists" element={<TherapistDirectory />} />
            <Route path="/dashboard" element={<ClientDashboard />} />
            <Route path="/appointments/book" element={<BookAppointment />} />
            <Route path="/counsellor/dashboard" element={<CounsellorDashboard />} />
            <Route path="/counsellor/profile" element={<CounsellorProfile />} />
            <Route path="/counsellor/manage-slots" element={<ManageSlots />} />
            <Route path="/counsellor/appointments" element={<MyAppointments />} />
            <Route path="/counsellor/earnings" element={<EarningsSummary />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/profile" element={<ClientProfile />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
