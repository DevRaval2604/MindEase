import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const DEBUG = (import.meta.env.VITE_DEBUG || 'false') === 'true';

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

function normalizeAppointmentShape(apt) {
  // Ensure fields exist and match what UI expects
  return {
    id: apt.id ?? apt.pk ?? apt.appointment_id ?? null,
    therapistId: apt.counsellor?.id ?? apt.therapistId ?? apt.therapist_id ?? apt.therapist?.id ?? null,
    therapistName: apt.counsellor?.full_name ?? apt.therapistName ?? apt.therapist_name ?? apt.therapist?.full_name ?? '',
    therapistEmail: apt.counsellor?.email ?? apt.therapistEmail ?? apt.therapist_email ?? '',
    datetimeIso: apt.appointment_date ?? apt.datetimeIso ?? apt.datetime ?? null,
    paymentStatus: (apt.payment_status ?? apt.paymentStatus ?? '').toString().toLowerCase(),
    googleMeetLink: apt.google_meet_link ?? apt.googleMeetLink ?? apt.meet_link ?? null,
    feedbackFormUrl: apt.feedback_form_url ?? apt.feedbackFormUrl ?? null,
    duration_minutes: apt.duration_minutes ?? apt.durationMinutes ?? apt.duration ?? 60,
    tags: apt.tags ?? apt.tag_list ?? [],
    feedbackSubmitted: apt.feedbackSubmitted ?? apt.feedback_submitted ?? false,
    // keep original payload under _raw if needed
    _raw: apt
  };
}

const DEMO_APPOINTMENTS = [
  {
    id: 101,
    therapistId: 201,
    therapistName: 'Dr. Demo Counsellor',
    therapistEmail: 'demo@therapist.local',
    datetimeIso: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    paymentStatus: 'paid',
    googleMeetLink: 'https://meet.google.com/demo-link',
    feedbackFormUrl: 'https://docs.google.com/forms/d/e/DEMO/viewform',
    tags: ['demo'],
    feedbackSubmitted: false
  },
  {
    id: 102,
    therapistId: 201,
    therapistName: 'Dr. Demo Counsellor',
    therapistEmail: 'demo@therapist.local',
    datetimeIso: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    paymentStatus: 'paid',
    googleMeetLink: 'https://meet.google.com/demo-link-2',
    feedbackFormUrl: 'https://docs.google.com/forms/d/e/DEMO/viewform',
    tags: ['follow-up'],
    feedbackSubmitted: false
  }
];

function ClientDashboard() {
  const { isAuthenticated } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [counsellors, setCounsellors] = useState([]);
  const [loadingCounsellors, setLoadingCounsellors] = useState(true);

  // Fetch counsellors (unchanged)
  useEffect(() => {
    const fetchCounsellors = async () => {
      if (!isAuthenticated) {
        setCounsellors([]);
        setLoadingCounsellors(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/therapists/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          const transformed = Array.isArray(data) && data.length > 0 ? data.map(t => ({
            id: t.id,
            name: t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Therapist',
            email: t.email,
            phone: t.phone,
            image: t.profile_picture || '',
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

  // Load appointments from backend, fallback to localStorage, optional demo-seed
  useEffect(() => {
    let cancelled = false;

    const saveCache = (list) => {
      try {
        localStorage.setItem('appointments', JSON.stringify(list));
      } catch (e) {
        console.warn('Failed to cache appointments to localStorage', e);
      }
    };

    const fetchFromApi = async () => {
      if (!isAuthenticated) {
        setAppointments([]);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/appointments/`, {
          method: 'GET',
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          // Normalize shapes and filter for client-side safety
          const normalized = Array.isArray(data) ? data.map(normalizeAppointmentShape) : [];
          if (!cancelled) {
            setAppointments(normalized);
            saveCache(normalized);
          }
          return;
        } else {
          console.warn('Appointments API returned', res.status);
        }
      } catch (err) {
        console.warn('Appointments API fetch failed:', err);
      }

      // API failed -> fallback to cache
      try {
        const cachedRaw = JSON.parse(localStorage.getItem('appointments') || '[]');
        const cached = Array.isArray(cachedRaw) ? cachedRaw.map(normalizeAppointmentShape) : [];
        if (cached.length > 0 && !cancelled) {
          setAppointments(cached);
          return;
        }
      } catch (e) {
        console.warn('Failed to parse cached appointments:', e);
      }

      // If still empty and in DEBUG, seed demo appointments to localStorage and state
      if (DEBUG && !cancelled) {
        const demo = DEMO_APPOINTMENTS.map(normalizeAppointmentShape);
        setAppointments(demo);
        saveCache(demo);
        console.info('Debug: seeded demo appointments into localStorage');
      } else if (!cancelled) {
        // nothing available
        setAppointments([]);
      }
    };

    fetchFromApi();

    // Refresh when window gains focus (user navigates back to tab)
    const handleFocus = () => {
      fetchFromApi();
    };

    // Listen for storage changes (when appointments are added from other tabs)
    const handleStorage = (e) => {
      if (e.key === 'appointments') {
        try {
          const newVal = JSON.parse(e.newValue || '[]').map(normalizeAppointmentShape);
          setAppointments(newVal);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isAuthenticated]);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    now.setSeconds(0, 0); // Reset seconds and milliseconds for accurate comparison

    const sorted = [...appointments].sort((a, b) => new Date(a.datetimeIso) - new Date(b.datetimeIso));

    return {
      upcoming: sorted.filter(a => {
        if (!a.datetimeIso) return false;
        const appointmentDate = new Date(a.datetimeIso);
        appointmentDate.setSeconds(0, 0);
        return appointmentDate > now;
      }),
      past: sorted.filter(a => {
        if (!a.datetimeIso) return false;
        const appointmentDate = new Date(a.datetimeIso);
        appointmentDate.setSeconds(0, 0);
        return appointmentDate <= now;
      }).reverse(),
    };
  }, [appointments]);

  function handleFeedbackSubmit(appointmentId) {
    // Get the appointment to find feedback form URL
    const appointmentsRaw = JSON.parse(localStorage.getItem('appointments') || '[]');
    const appointment = (appointmentsRaw || []).find(apt => (apt.id ?? apt.pk) === appointmentId);
    const googleFormUrl = appointment?.feedbackFormUrl || 'https://docs.google.com/forms/d/e/1FAIpQLSdEXAMPLE/viewform';
    window.open(googleFormUrl, '_blank');

    // Mark feedback as submitted
    const updated = (appointmentsRaw || []).map(apt =>
      (apt.id ?? apt.pk) === appointmentId ? { ...apt, feedbackSubmitted: true, feedbackSubmittedAt: new Date().toISOString() } : apt
    );
    try {
      localStorage.setItem('appointments', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save feedback state to localStorage', e);
    }
    setAppointments((prev) => prev.map(a => a.id === appointmentId ? { ...a, feedbackSubmitted: true, feedbackSubmittedAt: new Date().toISOString() } : a));
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-semibold text-gray-900">Upcoming Appointments</h2>
            {upcoming.length === 0 ? (
              <Card><div className="text-sm text-gray-600">No upcoming appointments yet.</div></Card>
            ) : (
              upcoming.map(a => {
                const counsellorDetails = getCounsellorDetails(a.therapistId);
                const displayName = counsellorDetails?.name || a.therapistName || 'Therapist';
                const displayEmail = counsellorDetails?.email || a.therapistEmail || '';
                const displayPhone = counsellorDetails?.phone || '';
                const displayImage = counsellorDetails?.image || '';

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
                        <div className="text-gray-600 mt-1">{new Date(a.datetimeIso).toLocaleString()} • {a.tags?.[0] || 'Therapy'} • <span className="text-green-700 font-medium">Confirmed</span></div>
                        {a.paymentStatus === 'paid' && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {a.googleMeetLink && (
                              <a
                                href={a.googleMeetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Join Google Meet Session
                              </a>
                            )}
                            {a.feedbackFormUrl && (
                              <button
                                onClick={() => {
                                  const googleFormUrl = a.feedbackFormUrl || 'https://docs.google.com/forms/d/e/1FAIpQLSdEXAMPLE/viewform';
                                  window.open(googleFormUrl, '_blank');
                                }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Submit Google Form
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
            <h2 className="font-semibold text-gray-900 mt-6">Past Appointments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {past.length === 0 ? (
                <Card><div className="text-sm text-gray-600">No past appointments yet.</div></Card>
              ) : (
                past.map(a => {
                  const hasFeedback = a.feedbackSubmitted || false;
                  const nextAppointmentTime = a.nextAppointmentTime || null;
                  const counsellorDetails = getCounsellorDetails(a.therapistId);
                  const displayName = counsellorDetails?.name || a.therapistName || 'Therapist';
                  const displayEmail = counsellorDetails?.email || a.therapistEmail || '';
                  const displayPhone = counsellorDetails?.phone || '';

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
                          {new Date(a.datetimeIso).toLocaleString()} • <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">Completed</span>
                        </div>
                        {a.paymentStatus && (
                          <div className="text-xs">
                            Payment:{' '}
                            <span className={`px-2 py-0.5 rounded-full ${a.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {a.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                          </div>
                        )}
                        {hasFeedback ? (
                          <div className="text-xs text-green-600">✓ Feedback submitted</div>
                        ) : (
                          <button
                            onClick={() => handleFeedbackSubmit(a.id)}
                            className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
                          >
                            Submit Feedback Form
                          </button>
                        )}
                        {nextAppointmentTime && (
                          <div className="text-xs text-gray-600">
                            Next appointment: {new Date(nextAppointmentTime).toLocaleString()}
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
              <div className="text-sm">
                <span className="font-semibold">Appointments Today</span>
                <div className="text-3xl font-bold mt-2">
                  {appointments.filter(a => {
                    if (!a.datetimeIso) return false;
                    const d = new Date(a.datetimeIso);
                    const now = new Date();
                    return d.toDateString() === now.toDateString();
                  }).length}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientDashboard;
