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
    <aside className="w-60 shrink-0 border-r border-gray-200 p-4 hidden md:block sticky top-0 h-screen overflow-y-auto">
      <div className="font-semibold text-gray-900 mb-4">MindEase</div>
      <nav className="space-y-2 text-sm">
        <a className="block px-3 py-2 rounded-md bg-blue-50 text-blue-700" href="#">Dashboard</a>
        <a className="block px-3 py-2 rounded-md hover:bg-gray-50" href="/appointments/book">Appointments</a>
        <a className="block px-3 py-2 rounded-md hover:bg-gray-50" href="/profile">Profile</a>
        <a className="block px-3 py-2 rounded-md hover:bg-gray-50" href="#">Settings</a>
      </nav>
    </aside>
  );
}

import { useEffect, useMemo, useState } from 'react';

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


