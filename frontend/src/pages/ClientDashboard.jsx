import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

function Card({ children, tone = 'default' }) {
  const toneClasses = {
    default: 'bg-white',
    confirmed: 'bg-green-50',
    cancelled: 'bg-red-50',
  };
  return (
    <div className={`border border-gray-200 rounded-xl shadow-sm p-4 ${toneClasses[tone]}`}>{children}</div>
  );
}

function Sidebar() {
  return (
    <aside className="w-80 bg-white shadow-lg">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">MindEase</h1>
        </div>

        <nav className="space-y-2">
          <Link
            to="/dashboard"
            className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors bg-blue-50 text-blue-700 border-r-2 border-blue-600"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
            </svg>
            Dashboard
          </Link>

          <Link
            to="/appointments/book"
            className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors text-gray-600 hover:bg-gray-50"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Appointments
          </Link>

          <Link
            to="/profile"
            className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors text-gray-600 hover:bg-gray-50"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile
          </Link>
        </nav>
      </div>
    </aside>
  );
}

function RescheduleModal({ appointment, isOpen, onClose, onSuccess }) {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState(null);

  useEffect(() => {
    if (isOpen && appointment) {
      // Set default date/time to current appointment
      const appointmentDate = new Date(appointment.datetimeIso || appointment.appointment_date);
      setNewDate(appointmentDate.toISOString().split('T')[0]);
      setNewTime(appointmentDate.toTimeString().slice(0, 5));
      setError('');
      setAvailabilityStatus(null);
    }
  }, [isOpen, appointment]);

  const checkAvailability = async () => {
    if (!newDate || !newTime) {
      setError('Please select both date and time');
      return;
    }

    setCheckingAvailability(true);
    setError('');
    setAvailabilityStatus(null);

    try {
      const dateTime = new Date(`${newDate}T${newTime}`);
      const response = await fetch(`${API_BASE}/api/appointments/check-availability/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          counsellor_id: appointment.counsellor || appointment.therapistId,
          date: newDate,
          duration_minutes: 60,
        }),
      });

      const data = await response.json();
      if (data.available) {
        setAvailabilityStatus({ available: true, message: 'Counsellor is available on this date' });
      } else {
        setAvailabilityStatus({ available: false, reason: data.reason || 'Counsellor is not available' });
      }
    } catch (err) {
      setError('Failed to check availability. Please try again.');
      console.error('Error checking availability:', err);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      setError('Please select both date and time');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const dateTime = new Date(`${newDate}T${newTime}`);
      if (dateTime <= new Date()) {
        setError('New appointment date must be in the future');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/api/appointments/reschedule/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          appointment_id: appointment.id,
          new_appointment_date: dateTime.toISOString(),
          duration_minutes: 60,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        setError(data.detail || 'Failed to reschedule appointment');
      }
    } catch (err) {
      setError('Failed to reschedule appointment. Please try again.');
      console.error('Error rescheduling appointment:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Reschedule Appointment</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Appointment</label>
            <p className="text-sm text-gray-600">
              {appointment && new Date(appointment.datetimeIso || appointment.appointment_date).toLocaleString()}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                setAvailabilityStatus(null);
              }}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Time</label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => {
                setNewTime(e.target.value);
                setAvailabilityStatus(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {newDate && newTime && (
            <div>
              <button
                onClick={checkAvailability}
                disabled={checkingAvailability}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {checkingAvailability ? 'Checking...' : 'Check Availability'}
              </button>
              {availabilityStatus && (
                <div className={`mt-2 p-2 rounded-md ${availabilityStatus.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {availabilityStatus.available ? '✓ Available' : `✗ ${availabilityStatus.reason}`}
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="p-2 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleReschedule}
              disabled={loading || !availabilityStatus?.available}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Rescheduling...' : 'Reschedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientDashboard() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [counsellors, setCounsellors] = useState([]);
  const [loadingCounsellors, setLoadingCounsellors] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Add refresh trigger
  const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, appointment: null });

  // Refresh appointments when navigating from payment page
  useEffect(() => {
    if (location.state?.paymentSuccess) {
      console.log('Payment successful, refreshing appointments...');
      // Trigger refresh by updating refreshKey
      setRefreshKey(prev => prev + 1);
      // Also reload after a short delay to ensure backend has processed the payment
      const timer = setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Fetch counsellors from database
  useEffect(() => {
    const fetchCounsellors = async () => {
      if (!isAuthenticated) {
        setCounsellors([]);
        setLoadingCounsellors(false);
        return;
      }

      try {
        // Use search API to fetch all counsellors (public endpoint, no auth required)
        const res = await fetch(`${API_BASE}/api/search/counsellors/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          // Backend returns paginated response: { results: [...], count, next, previous }
          const counsellorsList = data.results || data || [];
          
          // Transform database format to match component expectations
          const transformed = Array.isArray(counsellorsList) ? counsellorsList.map(t => ({
            id: t.id,
            name: t.full_name || `${(t.user?.first_name || '').trim()} ${(t.user?.last_name || '').trim()}`.trim() || 'Therapist',
            email: t.user?.email || '',
            phone: t.user?.phone || '',
            image: t.profile_picture || t.user?.profile_picture || '',
          })) : [];
          setCounsellors(transformed);
        } else {
          console.error('Failed to fetch counsellors');
          setCounsellors([]);
        }
      } catch (error) {
        console.error('Error fetching counsellors:', error);
        setCounsellors([]);
      } finally {
        setLoadingCounsellors(false);
      }
    };

    fetchCounsellors();
  }, [isAuthenticated]);

  // Get counsellor details by ID
  const getCounsellorDetails = (therapistId) => {
    if (!therapistId) return null;
    return counsellors.find(c => c.id === therapistId) || null;
  };

  useEffect(() => {
    const loadAppointments = async () => {
      if (!isAuthenticated) {
        setAppointments([]);
        return;
      }

      try {
        console.log('Fetching appointments from API...');
        // Fetch appointments from backend API
        const response = await fetch(`${API_BASE}/api/appointments/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        console.log('Appointments API response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Raw appointments data from API:', data);
          const appointmentsArray = Array.isArray(data) ? data : [];
          
          // Transform backend data to match frontend format
          const transformed = appointmentsArray.map(apt => ({
            id: apt.id,
            therapistId: apt.counsellor_profile_id || apt.counsellor?.id || apt.counsellor, // Use CounsellorProfile ID from backend
            counsellor: apt.counsellor || apt.counsellor_profile_id || apt.counsellor?.id, // Add counsellor user ID for reschedule
            therapistName: apt.counsellor_name || 'Therapist',
            therapistEmail: apt.counsellor_email || '',
            clientId: apt.client?.id || apt.client,
            clientName: apt.client_name || 'Client',
            clientEmail: apt.client_email || '',
            clientPhone: apt.client_phone || apt.client?.phone || '',
            tags: apt.counsellor_specializations || [],
            price: parseFloat(apt.amount) || 0,
            datetimeIso: apt.appointment_date,
            status: apt.status,
            paymentStatus: apt.payment_status, // Backend uses snake_case
            payment_status: apt.payment_status, // Keep both for compatibility
            google_meet_link: apt.google_meet_link,
            feedback_form_url: apt.feedback_form_url,
            feedbackSubmitted: apt.feedback_submitted || false,
            feedbackSubmittedAt: apt.feedback_submitted_at,
            can_join_meet: apt.can_join_meet || false,
            counsellor_image: apt.counsellor_image, // Add counsellor image from backend
          }));
          
          console.log('Transformed appointments:', transformed);
          console.log('Appointments with payment_status paid:', transformed.filter(a => a.paymentStatus === 'paid' || a.payment_status === 'paid'));
          setAppointments(transformed);
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch appointments. Status:', response.status, 'Error:', errorText);
          setAppointments([]);
        }
      } catch (error) {
        console.error('Error loading appointments:', error);
        setAppointments([]);
      }
    };

    loadAppointments();

    // Refresh when window gains focus
    const handleFocus = () => {
      console.log('Window focused, reloading appointments...');
      loadAppointments();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, refreshKey]); // Add refreshKey as dependency

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    now.setSeconds(0, 0); // Reset seconds and milliseconds for accurate comparison

    const sorted = [...appointments].sort((a, b) => new Date(a.datetimeIso || a.appointment_date) - new Date(b.datetimeIso || b.appointment_date));

    const upcomingList = sorted.filter(a => {
        const appointmentDate = new Date(a.datetimeIso || a.appointment_date);
        if (!appointmentDate || isNaN(appointmentDate.getTime())) {
          console.log('Invalid appointment date for appointment:', a.id);
          return false;
        }
        appointmentDate.setSeconds(0, 0);
        const isFuture = appointmentDate > now;
        // Check both paymentStatus (camelCase) and payment_status (snake_case)
        const isPaid = (a.paymentStatus === 'paid' || a.payment_status === 'paid');
        console.log(`Appointment ${a.id}: date=${appointmentDate.toISOString()}, isFuture=${isFuture}, isPaid=${isPaid}, paymentStatus=${a.paymentStatus || a.payment_status}, status=${a.status}`);
        return isFuture && isPaid;
      });
    
    const pastList = sorted.filter(a => {
        const appointmentDate = new Date(a.datetimeIso || a.appointment_date);
        if (!appointmentDate || isNaN(appointmentDate.getTime())) return false;
        appointmentDate.setSeconds(0, 0);
        // Include appointments that are past OR completed OR paid and past
        return appointmentDate <= now || a.status === 'completed';
      }).reverse();
    
    console.log('Upcoming appointments count:', upcomingList.length);
    console.log('Past appointments count:', pastList.length);
    
    return {
      upcoming: upcomingList,
      past: pastList,
    };
  }, [appointments]);

  function handleFeedbackSubmit(appointmentId) {
    // Get the appointment to find feedback form URL
    const appointment = appointments.find(apt => apt.id === appointmentId);
    const googleFormUrl = appointment?.feedback_form_url || 'https://docs.google.com/forms/d/e/1FAIpQLSdEXAMPLE/viewform';
    window.open(googleFormUrl, '_blank');

    // Note: In a real implementation, you would update the backend to mark feedback as submitted
    // For now, we'll just update the local state
    const updated = appointments.map(apt =>
      apt.id === appointmentId ? { ...apt, feedback_submitted: true, feedbackSubmitted: true, feedbackSubmittedAt: new Date().toISOString() } : apt
    );
    setAppointments(updated);
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
        {/* Success message */}
        {location.state?.paymentSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 text-sm">
              ✅ Payment successful! Your appointment has been confirmed. Refreshing appointments...
            </p>
          </div>
        )}
        
        {/* Refresh button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              console.log('Manual refresh triggered');
              setRefreshKey(prev => prev + 1);
            }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh Appointments
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Upcoming Appointments</h2>
              {past.length > 0 && (
                <button
                  onClick={() => {
                    const pastSection = document.getElementById('past-appointments');
                    if (pastSection) {
                      pastSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  View Past Appointments ({past.length})
                </button>
              )}
            </div>
            {upcoming.length === 0 ? (
              <Card><div className="text-sm text-gray-600">No upcoming appointments yet.</div></Card>
            ) : (
              upcoming.map(a => {
                const appointmentDateTime = a.datetimeIso || a.appointment_date;
                const counsellorDetails = getCounsellorDetails(a.therapistId);
                const displayName = a.counsellor_name || counsellorDetails?.name || a.therapistName || 'Therapist';
                const displayEmail = a.counsellor_email || counsellorDetails?.email || a.therapistEmail || '';
                const displayPhone = a.counsellor_phone || counsellorDetails?.phone || '';
                const displayImage = a.counsellor_image || counsellorDetails?.image || '';

                // Check if Google Meet button should be shown (only on appointment date)
                const appointmentDate = new Date(appointmentDateTime);
                const today = new Date();
                const isToday = appointmentDate.toDateString() === today.toDateString();
                const canJoinMeet = a.can_join_meet || (a.google_meet_link && isToday && a.payment_status === 'paid');

                return (
                  <Card key={a.id} tone="confirmed">
                    <div className="flex items-start gap-3">
                      {displayImage ? (
                        <img src={displayImage} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white grid place-items-center flex-shrink-0">
                          <span className="text-sm font-semibold">
                            {(displayName?.[0] || displayEmail?.[0] || 'T').toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 text-sm">
                        <div className="font-semibold text-gray-900">{displayName}</div>
                        {displayEmail && (
                          <div className="text-xs text-gray-500">{displayEmail}</div>
                        )}
                        {displayPhone && (
                          <div className="text-xs text-gray-500">📞 {displayPhone}</div>
                        )}
                        <div className="text-gray-600 mt-1">
                          {new Date(appointmentDateTime).toLocaleString()} • {(a.tags || a.counsellor_specializations || [])[0] || 'Therapy'} • <span className="text-green-700 font-medium">Confirmed</span>
                        </div>
                        {a.payment_status === 'paid' && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {/* Reschedule button */}
                            <button
                              onClick={() => setRescheduleModal({ isOpen: true, appointment: a })}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-700 transition-colors"
                              title="Reschedule this appointment"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Reschedule
                            </button>
                            {/* Show Google Meet link - always show if available */}
                            {a.google_meet_link ? (
                              <a
                                href={a.google_meet_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-2 px-3 py-1.5 text-white text-xs rounded-md transition-colors ${
                                  canJoinMeet 
                                    ? 'bg-green-600 hover:bg-green-700' 
                                    : 'bg-gray-500 hover:bg-gray-600'
                                }`}
                                title={canJoinMeet ? 'Join Google Meet now' : `Meeting available on ${new Date(appointmentDateTime).toLocaleDateString()}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                {canJoinMeet ? 'Join Google Meet' : `Meeting Link (${new Date(appointmentDateTime).toLocaleDateString()})`}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-500 italic">Google Meet link will be generated soon...</span>
                            )}
                            {/* Show feedback form button side by side with Google Meet link */}
                            {a.feedback_form_url && (
                              <button
                                onClick={() => {
                                  const googleFormUrl = a.feedback_form_url;
                                  window.open(googleFormUrl, '_blank');
                                }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                                title="Submit feedback for this appointment"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Submit Feedback
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
            <h2 id="past-appointments" className="font-semibold text-gray-900 mt-6">Past Appointments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {past.length === 0 ? (
                <Card><div className="text-sm text-gray-600">No past appointments yet.</div></Card>
              ) : (
                past.map(a => {
                  const appointmentDateTime = a.datetimeIso || a.appointment_date;
                  const hasFeedback = a.feedback_submitted || a.feedbackSubmitted || false;
                  const counsellorDetails = getCounsellorDetails(a.therapistId);
                  const displayName = a.counsellor_name || counsellorDetails?.name || a.therapistName || 'Therapist';
                  const displayEmail = a.counsellor_email || counsellorDetails?.email || a.therapistEmail || '';
                  const displayPhone = a.counsellor_phone || counsellorDetails?.phone || '';

                  return (
                    <Card key={a.id}>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-semibold">{displayName}</span>
                          {displayEmail && (
                            <span className="text-xs text-gray-500 ml-2">({displayEmail})</span>
                          )}
                          {displayPhone && (
                            <span className="text-xs text-gray-500 ml-2">📞 {displayPhone}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          {new Date(appointmentDateTime).toLocaleString()} • <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">Completed</span>
                        </div>
                        {a.payment_status && (
                          <div className="text-xs">
                            Payment: <span className={`px-2 py-0.5 rounded-full ${a.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {a.payment_status === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                          </div>
                        )}
                        {/* Show feedback form for past appointments */}
                        {a.payment_status === 'paid' && (
                          <div className="mt-2">
                            {hasFeedback ? (
                              <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                ✓ Feedback submitted {a.feedbackSubmittedAt && `on ${new Date(a.feedbackSubmittedAt).toLocaleDateString()}`}
                              </div>
                            ) : (
                              a.feedback_form_url ? (
                                <button
                                  onClick={() => handleFeedbackSubmit(a.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Submit Feedback
                                </button>
                              ) : (
                                <span className="text-xs text-gray-500 italic">Feedback form not available</span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Today's Overview</h2>
            <Card>
              <div className="text-sm"><span className="font-semibold">Appointments Today</span><div className="text-3xl font-bold mt-2">{appointments.filter(a => {
                const d = new Date(a.datetimeIso);
                const now = new Date();
                return d.toDateString() === now.toDateString();
              }).length}</div></div>
            </Card>
          </div>
        </div>
      </div>
      <RescheduleModal
        appointment={rescheduleModal.appointment}
        isOpen={rescheduleModal.isOpen}
        onClose={() => setRescheduleModal({ isOpen: false, appointment: null })}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1);
          setTimeout(() => setRefreshKey(prev => prev + 1), 1000);
        }}
      />
    </div>
  );
}

export default ClientDashboard;


