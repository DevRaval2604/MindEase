import { useEffect, useState } from 'react';

function Section({ title, children, action }) {
    return (
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{title}</h3>
                {action}
            </div>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function CounsellorDashboard() {
    const [activeTab, setActiveTab] = useState('profile');
    const [profile, setProfile] = useState({
        fullName: '',
        email: '',
        phone: '',
        licenseNumber: '',
        specialization: '',
        fees: '',
        availability: '',
        bio: '',
    });

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('counsellorProfile') || '{}');
            setProfile(p => ({ ...p, ...saved }));
        } catch (error) {
            console.error('CounsellorDashboard: Error loading profile data:', error);
        }
    }, []);

    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div className="space-y-6">
                        <Section title="Personal Information" action={<button className="text-sm px-3 py-1.5 border rounded-md">Edit Personal Info</button>}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <label className="text-gray-500">Full Name</label>
                                    <input className="w-full p-2.5 border rounded-md" value={profile.fullName || ''} readOnly />
                                </div>
                                <div>
                                    <label className="text-gray-500">Phone Number</label>
                                    <input className="w-full p-2.5 border rounded-md" value={profile.phone || ''} readOnly />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-gray-500">Email Address</label>
                                    <input className="w-full p-2.5 border rounded-md" value={profile.email || ''} readOnly />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-gray-500">Bio</label>
                                    <textarea className="w-full p-2.5 border rounded-md" value={profile.bio || ''} readOnly />
                                </div>
                            </div>
                        </Section>

                        <Section title="Professional Details" action={<button className="text-sm px-3 py-1.5 border rounded-md">Edit Professional Details</button>}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <label className="text-gray-500">License Number</label>
                                    <input className="w-full p-2.5 border rounded-md" value={profile.licenseNumber || ''} readOnly />
                                </div>
                                <div>
                                    <label className="text-gray-500">Issuing Body</label>
                                    <input className="w-full p-2.5 border rounded-md" value={"State Board of Counselling"} readOnly />
                                </div>
                                <div>
                                    <label className="text-gray-500">License Expiry</label>
                                    <input className="w-full p-2.5 border rounded-md" value={"2025-12-31"} readOnly />
                                </div>
                                <div>
                                    <label className="text-gray-500">Specializations</label>
                                    <div className="flex flex-wrap gap-2">
                                        {(profile.specialization ? [profile.specialization] : []).map(t => (
                                            <span key={t} className="px-2 py-1 text-xs rounded-full bg-gray-100 border">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Section>

                        <Section title="Fees & Standard Availability" action={<button className="text-sm px-3 py-1.5 border rounded-md">Adjust Fees & Availability</button>}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <label className="text-gray-500">Hourly Rate</label>
                                    <input className="w-full p-2.5 border rounded-md" value={profile.fees ? `₹${profile.fees}` : ''} readOnly />
                                </div>
                                <div>
                                    <label className="text-gray-500">Package Deals</label>
                                    <input className="w-full p-2.5 border rounded-md" value={"—"} readOnly />
                                </div>
                                <div>
                                    <label className="text-gray-500">Default Working Days</label>
                                    <input className="w-full p-2.5 border rounded-md" value={profile.availability || ''} readOnly />
                                </div>
                                <div>
                                    <label className="text-gray-500">Default Working Hours</label>
                                    <input className="w-full p-2.5 border rounded-md" value={"9:00 AM - 5:00 PM"} readOnly />
                                </div>
                            </div>
                        </Section>
                    </div>
                );
            case 'appointments':
                return (
                    <div className="space-y-6">
                        <Section title="My Appointments" action={<button className="text-sm px-3 py-1.5 border rounded-md">View All</button>}>
                            <div className="text-center py-8 text-gray-500">
                                <p>No appointments scheduled yet.</p>
                            </div>
                        </Section>
                    </div>
                );
            case 'slots':
                return (
                    <div className="space-y-6">
                        <Section title="Manage Time Slots" action={<button className="text-sm px-3 py-1.5 border rounded-md">Add Slot</button>}>
                            <div className="text-center py-8 text-gray-500">
                                <p>No time slots configured yet.</p>
                            </div>
                        </Section>
                    </div>
                );
            case 'earnings':
                return (
                    <div className="space-y-6">
                        <Section title="Earnings Summary" action={<button className="text-sm px-3 py-1.5 border rounded-md">Export</button>}>
                            <div className="text-center py-8 text-gray-500">
                                <p>No earnings data available yet.</p>
                            </div>
                        </Section>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-lg">
                <div className="p-6">
                    <div className="flex items-center space-x-2 mb-8">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">M</span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">MindEase</h1>
                    </div>

                    <nav className="space-y-2">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${activeTab === 'profile'
                                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            My Profile
                        </button>

                        <button
                            onClick={() => setActiveTab('appointments')}
                            className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${activeTab === 'appointments'
                                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            My Appointments
                        </button>

                        <button
                            onClick={() => setActiveTab('slots')}
                            className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${activeTab === 'slots'
                                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Manage Slots
                        </button>

                        <button
                            onClick={() => setActiveTab('earnings')}
                            className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${activeTab === 'earnings'
                                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            Earnings Summary
                        </button>
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            {activeTab === 'profile' && 'My Profile'}
                            {activeTab === 'appointments' && 'My Appointments'}
                            {activeTab === 'slots' && 'Manage Time Slots'}
                            {activeTab === 'earnings' && 'Earnings Summary'}
                        </h1>
                        <p className="text-gray-600">
                            {activeTab === 'profile' && 'View and manage your professional information'}
                            {activeTab === 'appointments' && 'Manage your scheduled appointments'}
                            {activeTab === 'slots' && 'Set your available time slots'}
                            {activeTab === 'earnings' && 'Track your earnings and payments'}
                        </p>
                    </div>

                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

export default CounsellorDashboard;



