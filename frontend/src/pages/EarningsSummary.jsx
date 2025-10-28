import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function EarningsSummary() {
    const [earnings, setEarnings] = useState({
        daily: 0,
        weekly: 0,
        monthly: 0,
        yearly: 0
    });
    const [selectedPeriod, setSelectedPeriod] = useState('daily');
    const [appointments, setAppointments] = useState([]);

    useEffect(() => {
        try {
            const data = JSON.parse(localStorage.getItem('appointments') || '[]');
            setAppointments(Array.isArray(data) ? data : []);
            calculateEarnings(data);
        } catch (_) {
            setAppointments([]);
        }
    }, []);

    function calculateEarnings(appointmentData) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const yearStart = new Date(now.getFullYear(), 0, 1);

        const completedAppointments = appointmentData.filter(apt =>
            new Date(apt.datetimeIso) < now
        );

        const dailyEarnings = completedAppointments
            .filter(apt => new Date(apt.datetimeIso) >= today)
            .reduce((sum, apt) => sum + 1500, 0); // Assuming 1500 per session

        const weeklyEarnings = completedAppointments
            .filter(apt => new Date(apt.datetimeIso) >= weekStart)
            .reduce((sum, apt) => sum + 1500, 0);

        const monthlyEarnings = completedAppointments
            .filter(apt => new Date(apt.datetimeIso) >= monthStart)
            .reduce((sum, apt) => sum + 1500, 0);

        const yearlyEarnings = completedAppointments
            .filter(apt => new Date(apt.datetimeIso) >= yearStart)
            .reduce((sum, apt) => sum + 1500, 0);

        setEarnings({
            daily: dailyEarnings,
            weekly: weeklyEarnings,
            monthly: monthlyEarnings,
            yearly: yearlyEarnings
        });
    }

    function getPreviousYearEarnings() {
        const lastYear = new Date().getFullYear() - 1;
        const lastYearStart = new Date(lastYear, 0, 1);
        const lastYearEnd = new Date(lastYear, 11, 31);

        return appointments
            .filter(apt => {
                const aptDate = new Date(apt.datetimeIso);
                return aptDate >= lastYearStart && aptDate <= lastYearEnd;
            })
            .reduce((sum, apt) => sum + 1500, 0);
    }

    const currentEarning = earnings[selectedPeriod];
    const previousYearEarning = getPreviousYearEarnings();

    return (
        <div className="flex h-screen">
            <aside className="w-60 shrink-0 border-r border-gray-200 p-4 hidden md:block sticky top-0 h-screen overflow-y-auto">
                <div className="font-semibold text-gray-900 mb-4">MindEase</div>
                <nav className="space-y-2 text-sm">
                    <Link className="block px-3 py-2 rounded-md hover:bg-gray-50" to="/counsellor/dashboard">My Profile</Link>
                    <Link className="block px-3 py-2 rounded-md hover:bg-gray-50" to="/counsellor/manage-slots">Manage Slots</Link>
                    <Link className="block px-3 py-2 rounded-md hover:bg-gray-50" to="/counsellor/appointments">My Appointments</Link>
                    <Link className="block px-3 py-2 rounded-md bg-blue-50 text-blue-700" to="/counsellor/earnings">Earnings Summary</Link>
                    <div className="mt-6 text-xs text-gray-500">Settings • Help</div>
                </nav>
            </aside>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Earnings Summary</h1>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Today</p>
                                <p className="text-2xl font-bold text-gray-900">₹{earnings.daily}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-green-600 text-xl">₹</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">This Week</p>
                                <p className="text-2xl font-bold text-gray-900">₹{earnings.weekly}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 text-xl">₹</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">This Month</p>
                                <p className="text-2xl font-bold text-gray-900">₹{earnings.monthly}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-600 text-xl">₹</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">This Year</p>
                                <p className="text-2xl font-bold text-gray-900">₹{earnings.yearly}</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                <span className="text-orange-600 text-xl">₹</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed View</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Period</label>
                                <select
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                                    className="w-full p-2.5 border rounded-md"
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-gray-900">₹{currentEarning}</p>
                                    <p className="text-sm text-gray-600 capitalize">{selectedPeriod} earnings</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Previous Year Comparison</h2>
                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-gray-900">₹{previousYearEarning}</p>
                                    <p className="text-sm text-gray-600">Last year ({new Date().getFullYear() - 1}) earnings</p>
                                </div>
                            </div>
                            <div className="text-center">
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                    View Yearly Report
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h2>
                    <div className="space-y-3">
                        {appointments.slice(0, 5).map(appointment => (
                            <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900">{appointment.therapistName}</p>
                                    <p className="text-sm text-gray-600">{new Date(appointment.datetimeIso).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-900">₹1500</p>
                                    <p className="text-sm text-green-600">Completed</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EarningsSummary;
