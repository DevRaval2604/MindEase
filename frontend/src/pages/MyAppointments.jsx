import { useEffect, useState } from 'react';

function MyAppointments() {
    const [appointments, setAppointments] = useState([]);

    useEffect(() => {
        try {
            const data = JSON.parse(localStorage.getItem('appointments') || '[]');
            setAppointments(Array.isArray(data) ? data : []);
        } catch (_) {
            setAppointments([]);
        }
    }, []);

    const { upcoming, past } = {
        upcoming: appointments.filter(a => new Date(a.datetimeIso) >= new Date()).sort((a, b) => new Date(a.datetimeIso) - new Date(b.datetimeIso)),
        past: appointments.filter(a => new Date(a.datetimeIso) < new Date()).sort((a, b) => new Date(b.datetimeIso) - new Date(a.datetimeIso))
    };

    function getClientDetails(appointment) {
        // In a real app, this would fetch from a database
        // For now, we'll use mock data based on appointment ID
        const mockClients = {
            1: { name: 'John Doe', email: 'john@example.com', phone: '+91 98765 43210' },
            2: { name: 'Jane Smith', email: 'jane@example.com', phone: '+91 98765 43211' },
            3: { name: 'Mike Johnson', email: 'mike@example.com', phone: '+91 98765 43212' }
        };
        return mockClients[appointment.id % 3 + 1] || { name: 'Client', email: 'client@example.com', phone: 'N/A' };
    }

    return (
        <div className="flex h-screen">
            <aside className="w-60 shrink-0 border-r border-gray-200 p-4 hidden md:block sticky top-0 h-screen overflow-y-auto">
                <div className="font-semibold text-gray-900 mb-4">MindEase</div>
                <nav className="space-y-2 text-sm">
                    <a className="block px-3 py-2 rounded-md hover:bg-gray-50" href="/counsellor/dashboard">My Profile</a>
                    <a className="block px-3 py-2 rounded-md hover:bg-gray-50" href="/counsellor/manage-slots">Manage Slots</a>
                    <a className="block px-3 py-2 rounded-md bg-blue-50 text-blue-700" href="/counsellor/appointments">My Appointments</a>
                    <a className="block px-3 py-2 rounded-md hover:bg-gray-50" href="/counsellor/earnings">Earnings Summary</a>
                    <div className="mt-6 text-xs text-gray-500">Settings • Help</div>
                </nav>
            </aside>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">My Appointments</h1>

                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Appointments</h2>
                        {upcoming.length === 0 ? (
                            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                                <p className="text-gray-500">No upcoming appointments</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {upcoming.map(appointment => {
                                    const client = getClientDetails(appointment);
                                    return (
                                        <div key={appointment.id} className="bg-white border border-gray-200 rounded-xl p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                                            <span className="text-blue-600 font-semibold">{client.name.charAt(0)}</span>
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-gray-900">{client.name}</h3>
                                                            <p className="text-sm text-gray-600">{appointment.therapistName}</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-gray-500">Date & Time:</span>
                                                            <p className="font-medium">{new Date(appointment.datetimeIso).toLocaleString()}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">Email:</span>
                                                            <p className="font-medium">{client.email}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">Phone:</span>
                                                            <p className="font-medium">{client.phone}</p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3">
                                                        <span className="text-gray-500">Specialization:</span>
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            {appointment.tags.map(tag => (
                                                                <span key={tag} className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">
                                                        Confirmed
                                                    </span>
                                                    <button className="px-3 py-1 text-xs border rounded-md hover:bg-gray-50">
                                                        View Details
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Appointments</h2>
                        {past.length === 0 ? (
                            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                                <p className="text-gray-500">No past appointments</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {past.map(appointment => {
                                    const client = getClientDetails(appointment);
                                    return (
                                        <div key={appointment.id} className="bg-white border border-gray-200 rounded-xl p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <span className="text-gray-600 font-semibold">{client.name.charAt(0)}</span>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{client.name}</h3>
                                                    <p className="text-sm text-gray-600">{new Date(appointment.datetimeIso).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-600 space-y-1">
                                                <p><span className="text-gray-500">Time:</span> {new Date(appointment.datetimeIso).toLocaleTimeString()}</p>
                                                <p><span className="text-gray-500">Email:</span> {client.email}</p>
                                            </div>
                                            <div className="mt-3">
                                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                                                    Completed
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MyAppointments;
