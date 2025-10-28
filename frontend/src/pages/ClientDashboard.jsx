import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

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

function ClientDashboard() {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('appointments') || '[]');
      setAppointments(Array.isArray(data) ? data : []);
    } catch (_) {
      setAppointments([]);
    }
  }, []);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const sorted = [...appointments].sort((a, b) => new Date(a.datetimeIso) - new Date(b.datetimeIso));
    return {
      upcoming: sorted.filter(a => new Date(a.datetimeIso) >= now),
      past: sorted.filter(a => new Date(a.datetimeIso) < now).reverse(),
    };
  }, [appointments]);

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
              upcoming.map(a => (
                <Card key={a.id} tone="confirmed">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500 text-white grid place-items-center">👤</div>
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">{a.therapistName}</div>
                      <div className="text-gray-600">{new Date(a.datetimeIso).toLocaleString()} • {a.tags?.[0] || 'Therapy'} • <span className="text-green-700 font-medium">Confirmed</span></div>
                    </div>
                  </div>
                </Card>
              ))
            )}
            <h2 className="font-semibold text-gray-900 mt-6">Past Appointments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {past.length === 0 ? (
                <Card><div className="text-sm text-gray-600">No past appointments yet.</div></Card>
              ) : (
                past.map(a => (
                  <Card key={a.id}>
                    <div className="text-sm"><span className="font-semibold">{a.therapistName}</span> • {new Date(a.datetimeIso).toLocaleString()} • <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">Completed</span></div>
                  </Card>
                ))
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
    </div>
  );
}

export default ClientDashboard;


