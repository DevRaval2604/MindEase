import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

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
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const [activeTab, setActiveTab] = useState('appointments');
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
    const [appointments, setAppointments] = useState([]);
    const [slots, setSlots] = useState([]);
    const [clients, setClients] = useState([]); // Store client data from database
    const [loadingClients, setLoadingClients] = useState(true);
    const [newSlot, setNewSlot] = useState({
        date: '',
        startTime: '',
        endTime: '',
        isAvailable: true
    });
    const [earnings, setEarnings] = useState({
        daily: 0,
        weekly: 0,
        monthly: 0,
        yearly: 0
    });
    const [selectedPeriod, setSelectedPeriod] = useState('daily');

    // Fetch counsellor profile from database
    useEffect(() => {
        const fetchProfile = async () => {
            if (!isAuthenticated) return;

            try {
                const res = await fetch(`${API_BASE}/api/auth/profile/`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });

                if (res.ok) {
                    const data = await res.json();
                    // Map server fields to local state
                    const dbFullName = data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || '';
                    const dbEmail = data.email || '';
                    const dbPhone = data.phone || '';
                    const dbLicense = data.license_number || '';
                    const dbFees = data.fees_per_session || '';
                    const dbBio = data.bio || '';
                    const dbSpecializations = (data.specializations || []).map(s => s.name).join(', ');
                    const dbAvailability = (data.availability || []).map(a => a.name).join(', ');

                    setProfile(prev => ({
                        ...prev,
                        fullName: dbFullName,
                        email: dbEmail,
                        phone: dbPhone,
                        licenseNumber: dbLicense,
                        fees: dbFees,
                        bio: dbBio,
                        specialization: dbSpecializations || prev.specialization,
                        availability: dbAvailability || prev.availability,
                    }));
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        };

        fetchProfile();
    }, [isAuthenticated]);

    // Fetch clients from database (users with role='client')
    useEffect(() => {
        const fetchClients = async () => {
            if (!isAuthenticated) {
                setClients([]);
                setLoadingClients(false);
                return;
            }

            try {
                // For now, we'll use client data from appointments since there's no direct client endpoint
                // In a real app, you'd have a /api/auth/clients/ endpoint
                setLoadingClients(false);
            } catch (error) {
                console.error('Error fetching clients:', error);
                setClients([]);
                setLoadingClients(false);
            }
        };

        fetchClients();
    }, [isAuthenticated]);

    // Load appointments filtered by logged-in counsellor
    useEffect(() => {
        if (!isAuthenticated || !user?.id) {
            setAppointments([]);
            return;
        }

        const loadAppointments = async () => {
            if (!isAuthenticated || !user?.id) {
                setAppointments([]);
                return;
            }
        
            try {
                const res = await fetch(`${API_BASE}/api/appointments/`, {
                    method: 'GET',
                    credentials: 'include'
                });
        
                if (!res.ok) throw new Error("Failed to load appointments");
        
                const data = await res.json();
        
                // Filter counsellor appointments
                const counsellorAppointments = data.filter(apt =>
                    apt.counsellor.id === user.id
                );
        
                setAppointments(counsellorAppointments);
                calculateEarnings(counsellorAppointments);
            } catch (error) {
                console.error("API error:", error);
                setAppointments([]);
            }
        };        

        loadAppointments();

        // Refresh when window gains focus
        const handleFocus = () => {
            loadAppointments();
        };

        window.addEventListener('storage', loadAppointments);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('storage', loadAppointments);
            window.removeEventListener('focus', handleFocus);
        };
    }, [isAuthenticated, user]);

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('counsellorSlots') || '[]');
            setSlots(Array.isArray(saved) ? saved : []);
        } catch (_) {
            setSlots([]);
        }
    }, []);

    // Get client details from appointment data (stored when booking)
    function getClientDetails(appointment) {
        // Use actual client data from appointment instead of mock data
        return {
            name: appointment.clientName || 'Client',
            email: appointment.clientEmail || 'N/A',
            phone: appointment.clientPhone || 'N/A',
            id: appointment.clientId || null,
        };
    }

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

    function handleAddSlot(e) {
        e.preventDefault();
        if (!newSlot.date || !newSlot.startTime || !newSlot.endTime) return;

        const slot = {
            id: Date.now(),
            ...newSlot,
            date: new Date(newSlot.date).toISOString().split('T')[0]
        };

        const updated = [...slots, slot];
        setSlots(updated);
        localStorage.setItem('counsellorSlots', JSON.stringify(updated));
        setNewSlot({ date: '', startTime: '', endTime: '', isAvailable: true });
    }

    function toggleSlot(id) {
        const updated = slots.map(slot =>
            slot.id === id ? { ...slot, isAvailable: !slot.isAvailable } : slot
        );
        setSlots(updated);
        localStorage.setItem('counsellorSlots', JSON.stringify(updated));
    }

    function deleteSlot(id) {
        const updated = slots.filter(slot => slot.id !== id);
        setSlots(updated);
        localStorage.setItem('counsellorSlots', JSON.stringify(updated));
    }

    const { upcoming, past } = {
        upcoming: appointments.filter(a => new Date(a.datetimeIso) >= new Date()).sort((a, b) => new Date(a.datetimeIso) - new Date(b.datetimeIso)),
        past: appointments.filter(a => new Date(a.datetimeIso) < new Date()).sort((a, b) => new Date(b.datetimeIso) - new Date(a.datetimeIso))
    };

    const currentEarning = earnings[selectedPeriod];
    const previousYearEarning = getPreviousYearEarnings();

    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div className="space-y-8">
                        {/* Profile Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
                            <div className="flex items-center space-x-6">
                                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                    <span className="text-3xl font-bold text-white">👨‍⚕️</span>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold mb-2">{profile.fullName || 'Dr. Counsellor'}</h2>
                                    <p className="text-blue-100 text-lg">{profile.specialization || 'Mental Health Counsellor'}</p>
                                    <div className="flex items-center mt-3 space-x-4">
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="text-sm">Licensed Professional</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm">Verified</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Personal Information */}
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
                                    </div>
                                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                                        Edit Personal Info
                                    </button>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            <span>Full Name</span>
                                        </label>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <span className="text-gray-900 font-medium">{profile.fullName || 'Not provided'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            <span>Phone Number</span>
                                        </label>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <span className="text-gray-900 font-medium">{profile.phone || 'Not provided'}</span>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            <span>Email Address</span>
                                        </label>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <span className="text-gray-900 font-medium">{profile.email || 'Not provided'}</span>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span>Bio</span>
                                        </label>
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[100px]">
                                            <p className="text-gray-700 leading-relaxed">{profile.bio || 'No bio provided yet. Tell clients about your experience and approach to counselling.'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Professional Details */}
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-gray-50 to-green-50 px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900">Professional Details</h3>
                                    </div>
                                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                                        Edit Professional Details
                                    </button>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                            <span>License Number</span>
                                        </label>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <span className="text-gray-900 font-medium">{profile.licenseNumber || 'Not provided'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            <span>Issuing Body</span>
                                        </label>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <span className="text-gray-900 font-medium">State Board of Counselling</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span>License Expiry</span>
                                        </label>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <span className="text-gray-900 font-medium">2025-12-31</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                            </svg>
                                            <span>Specializations</span>
                                        </label>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex flex-wrap gap-2">
                                                {(profile.specialization ? [profile.specialization] : ['General Counselling']).map(t => (
                                                    <span key={t} className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-medium">
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fees & Availability */}
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-gray-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900">Fees & Availability</h3>
                                    </div>
                                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                                        Adjust Fees & Availability
                                    </button>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                            <span>Hourly Rate</span>
                                        </label>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <span className="text-gray-900 font-medium text-lg">{profile.fees ? `₹${profile.fees}` : 'Not set'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                            <span>Package Deals</span>
                                        </label>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <span className="text-gray-500">Coming soon</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span>Working Days</span>
                                        </label>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <span className="text-gray-900 font-medium">{profile.availability || 'Monday - Friday'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>Working Hours</span>
                                        </label>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <span className="text-gray-900 font-medium">9:00 AM - 5:00 PM</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'appointments':
                return (
                    <div className="space-y-8">
                        {/* Appointments Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
                            <div className="flex items-center space-x-6">
                                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold mb-2">My Appointments</h2>
                                    <p className="text-blue-100 text-lg">Manage your scheduled sessions</p>
                                    <div className="flex items-center mt-3 space-x-4">
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm">{upcoming.length} Upcoming</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm">{past.length} Completed</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Upcoming Appointments */}
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900">Upcoming Appointments</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                {upcoming.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-500 text-lg">No upcoming appointments</p>
                                        <p className="text-gray-400 text-sm mt-2">Your upcoming sessions will appear here</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {upcoming.map(appointment => {
                                            const client = getClientDetails(appointment);
                                            return (
                                                <div key={appointment.id} className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-4 mb-4">
                                                                <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center">
                                                                    <span className="text-white font-bold text-lg">{client.name.charAt(0)}</span>
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-xl font-semibold text-gray-900">{client.name}</h3>
                                                                    <p className="text-sm text-gray-600">Client Appointment</p>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                                <div className="space-y-1">
                                                                    <span className="text-gray-500 font-medium">Date & Time:</span>
                                                                    <p className="font-semibold text-gray-900">{new Date(appointment.datetimeIso).toLocaleString()}</p>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <span className="text-gray-500 font-medium">Email:</span>
                                                                    <p className="font-semibold text-gray-900">{client.email}</p>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <span className="text-gray-500 font-medium">Phone:</span>
                                                                    <p className="font-semibold text-gray-900">{client.phone}</p>
                                                                </div>
                                                            </div>
                                                            {appointment.tags && appointment.tags.length > 0 && (
                                                                <div className="mt-4">
                                                                    <span className="text-gray-500 font-medium">Tags:</span>
                                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                                        {appointment.tags.map((tag, idx) => (
                                                                            <span key={idx} className="px-3 py-1 text-sm rounded-full bg-purple-100 text-purple-700 border border-purple-200 font-medium">
                                                                                {tag}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col gap-3">
                                                            <span className="px-4 py-2 text-sm rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">
                                                                Confirmed
                                                            </span>
                                                            <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
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
                        </div>

                        {/* Past Appointments */}
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-gray-50 to-green-50 px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900">Past Appointments</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                {past.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-500 text-lg">No past appointments</p>
                                        <p className="text-gray-400 text-sm mt-2">Your completed sessions will appear here</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {past.map(appointment => {
                                            const client = getClientDetails(appointment);
                                            return (
                                                <div key={appointment.id} className="bg-gradient-to-r from-gray-50 to-green-50 border border-gray-200 rounded-xl p-6">
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                                                            <span className="text-white font-bold">{client.name.charAt(0)}</span>
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-gray-900 text-lg">{client.name}</h3>
                                                            <p className="text-sm text-gray-600">{new Date(appointment.datetimeIso).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">Time:</span>
                                                            <span className="font-medium text-gray-900">{new Date(appointment.datetimeIso).toLocaleTimeString()}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">Email:</span>
                                                            <span className="font-medium text-gray-900">{client.email}</span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4">
                                                        <span className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-medium">
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
                );
            case 'slots':
                return (
                    <div className="space-y-8">
                        {/* Slots Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
                            <div className="flex items-center space-x-6">
                                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold mb-2">Manage Time Slots</h2>
                                    <p className="text-blue-100 text-lg">Set your available consultation hours</p>
                                    <div className="flex items-center mt-3 space-x-4">
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm">{slots.length} Total Slots</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm">{slots.filter(s => s.isAvailable).length} Available</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Add New Slot */}
                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900">Add New Slot</h3>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <form onSubmit={handleAddSlot} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>Date</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={newSlot.date}
                                                onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>Start Time</span>
                                                </label>
                                                <input
                                                    type="time"
                                                    value={newSlot.startTime}
                                                    onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>End Time</span>
                                                </label>
                                                <input
                                                    type="time"
                                                    value={newSlot.endTime}
                                                    onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
                                        >
                                            Add Slot
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Available Slots */}
                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-gray-50 to-green-50 px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900">Your Available Slots</h3>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {slots.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <p className="text-gray-500 text-lg">No slots added yet</p>
                                                <p className="text-gray-400 text-sm mt-2">Add your first time slot to get started</p>
                                            </div>
                                        ) : (
                                            slots.map(slot => (
                                                <div key={slot.id} className="bg-gradient-to-r from-gray-50 to-green-50 border border-gray-200 rounded-xl p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-3 mb-2">
                                                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-gray-900 text-lg">
                                                                        {new Date(slot.date).toLocaleDateString()}
                                                                    </div>
                                                                    <div className="text-sm text-gray-600">
                                                                        {slot.startTime} - {slot.endTime}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => toggleSlot(slot.id)}
                                                                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${slot.isAvailable
                                                                    ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
                                                                    : 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'
                                                                    }`}
                                                            >
                                                                {slot.isAvailable ? 'Available' : 'Unavailable'}
                                                            </button>
                                                            <button
                                                                onClick={() => deleteSlot(slot.id)}
                                                                className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'earnings':
                return (
                    <div className="space-y-8">
                        {/* Earnings Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
                            <div className="flex items-center space-x-6">
                                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold mb-2">Earnings Summary</h2>
                                    <p className="text-blue-100 text-lg">Track your consultation income</p>
                                    <div className="flex items-center mt-3 space-x-4">
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                            <span className="text-sm">Total Sessions: {appointments.length}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm">Current Period: {selectedPeriod}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Earnings Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">Today</h3>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="text-3xl font-bold text-gray-900 mb-2">₹{earnings.daily}</div>
                                    <p className="text-sm text-gray-600">Today's earnings</p>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-gray-50 to-green-50 px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">This Week</h3>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="text-3xl font-bold text-gray-900 mb-2">₹{earnings.weekly}</div>
                                    <p className="text-sm text-gray-600">Weekly earnings</p>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-gray-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">This Month</h3>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="text-3xl font-bold text-gray-900 mb-2">₹{earnings.monthly}</div>
                                    <p className="text-sm text-gray-600">Monthly earnings</p>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-gray-50 to-orange-50 px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">This Year</h3>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="text-3xl font-bold text-gray-900 mb-2">₹{earnings.yearly}</div>
                                    <p className="text-sm text-gray-600">Yearly earnings</p>
                                </div>
                            </div>
                        </div>

                        {/* Detailed View and Comparison */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Detailed View */}
                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900">Detailed View</h3>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>Select Period</span>
                                            </label>
                                            <select
                                                value={selectedPeriod}
                                                onChange={(e) => setSelectedPeriod(e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                            >
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                                <option value="yearly">Yearly</option>
                                            </select>
                                        </div>
                                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
                                            <div className="text-center">
                                                <div className="text-4xl font-bold text-gray-900 mb-2">₹{currentEarning}</div>
                                                <p className="text-gray-600 font-medium capitalize">{selectedPeriod} earnings</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Previous Year Comparison */}
                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-gray-50 to-green-50 px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900">Previous Year Comparison</h3>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
                                            <div className="text-center">
                                                <div className="text-3xl font-bold text-gray-900 mb-2">₹{previousYearEarning}</div>
                                                <p className="text-gray-600 font-medium">Last year ({new Date().getFullYear() - 1}) earnings</p>
                                            </div>
                                        </div>
                                        <button className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-200 font-medium">
                                            View Yearly Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Transactions */}
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-gray-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900">Recent Transactions</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    {appointments.slice(0, 5).map(appointment => {
                                        const client = getClientDetails(appointment);
                                        return (
                                            <div key={appointment.id} className="bg-gradient-to-r from-gray-50 to-purple-50 border border-gray-200 rounded-xl p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                                                            <span className="text-white font-bold">{client.name.charAt(0)}</span>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 text-lg">{client.name}</h4>
                                                            <p className="text-sm text-gray-600">{new Date(appointment.datetimeIso).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-gray-900">₹{profile.fees || 0}</div>
                                                        <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">
                                                            Completed
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
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



