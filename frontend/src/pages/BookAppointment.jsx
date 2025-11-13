import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { format } from 'date-fns';
import 'react-calendar/dist/Calendar.css';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

function TimeButton({ label, selected, onClick }) {
  const base = "px-4 py-2 rounded-md border text-sm";
  const selectedClasses = selected ? " bg-blue-600 text-white border-blue-600" : " hover:bg-gray-50";
  return <button onClick={onClick} className={base + selectedClasses}>{label}</button>;
}

function BookAppointment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [therapist, setTherapist] = useState(location.state?.therapist || null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [therapistList, setTherapistList] = useState([]);
  const [loadingTherapists, setLoadingTherapists] = useState(true);
  const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'];

  // Fetch counsellors from backend API
  useEffect(() => {
    const fetchCounsellors = async () => {
      setLoadingTherapists(true);
      try {
        // Use search API for better filtering capabilities
        const params = new URLSearchParams();
        if (searchQuery.trim()) {
          params.append('q', searchQuery.trim());
        }
        if (specialization) {
          params.append('specialization', specialization);
        }

        const res = await fetch(`${API_BASE}/api/search/counsellors/?${params.toString()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          console.log('BookAppointment: Fetched counsellors from API:', data);

          // Backend returns paginated response: { results: [...], count, next, previous }
          const counsellors = data.results || data || [];

          // Transform backend response to match frontend format
          // Backend returns: id (CounsellorProfile.id), full_name, profile_picture, specializations, fees_per_session
          // We need to store both the CounsellorProfile.id and User.id for appointment creation
          const transformed = Array.isArray(counsellors) ? counsellors.map(counsellor => ({
            id: counsellor.id,  // CounsellorProfile.id (for display/selection)
            userId: counsellor.user?.id,  // User.id (for appointment creation)
            name: counsellor.full_name || 'Counsellor',
            email: counsellor.user?.email || '',
            phone: counsellor.user?.phone || '',
            image: counsellor.profile_picture || null,
            tags: counsellor.specializations ? counsellor.specializations.map(s => s.name || s) : [],
            price: counsellor.fees_per_session ? parseFloat(counsellor.fees_per_session) : 0,
            experience: counsellor.experience || '',
            availability: counsellor.availability || [],
          })) : [];

          console.log('BookAppointment: Transformed counsellors:', transformed);
          setTherapistList(transformed);

          // If therapist was passed via location state, find and set it
          if (location.state?.therapist && transformed.length > 0) {
            const found = transformed.find(t =>
              t.id === location.state.therapist.id ||
              t.email === location.state.therapist.email ||
              t.name === location.state.therapist.name
            );
            if (found) setTherapist(found);
          }
        } else {
          const errorText = await res.text();
          console.error('Failed to fetch counsellors. Status:', res.status, 'Response:', errorText);
          setTherapistList([]);
        }
      } catch (error) {
        console.error('Error fetching counsellors:', error);
        setTherapistList([]);
      } finally {
        setLoadingTherapists(false);
      }
    };

    fetchCounsellors();
  }, [location.state, searchQuery, specialization]); // Re-fetch when search or filter changes

  function handleConfirm() {
    if (!selectedDate || !selectedTime || !therapist) return;
    // Build a combined Date from selected date + time string
    const [time, meridiem] = selectedTime.split(' ');
    const [hhStr, mmStr] = time.split(':');
    let hours = parseInt(hhStr, 10);
    const minutes = parseInt(mmStr, 10);
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    const appointmentDate = new Date(selectedDate);
    appointmentDate.setHours(hours, minutes, 0, 0);

    // Navigate to payment page with appointment data
    // Use userId (User.id) for appointment creation, not the CounsellorProfile.id
    navigate('/payment', {
      state: {
        appointmentData: {
          therapistId: therapist.userId || therapist.id,  // Prefer userId, fallback to id
          therapistName: therapist.name || 'Therapist',
          therapistEmail: therapist.email || '',
          clientId: user?.id,
          clientName: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Client',
          clientEmail: user?.email || '',
          clientPhone: user?.phone || '',
          tags: therapist.tags || [],
          price: therapist.price || 0,
          datetimeIso: appointmentDate.toISOString(),
          notes: '',
        },
      },
    });
  }
  return (
    <div className="flex h-screen">
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
              className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors text-gray-600 hover:bg-gray-50"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
              Dashboard
            </Link>

            <Link
              to="/appointments/book"
              className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors bg-blue-50 text-blue-700 border-r-2 border-blue-600"
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
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Book Appointment</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="font-semibold text-gray-900 mb-3">Select Therapist</div>
              {loadingTherapists ? (
                <div className="text-sm text-gray-600 py-8 text-center">Loading therapists...</div>
              ) : therapistList.length === 0 ? (
                <div className="text-sm text-gray-600 py-8 text-center">No therapists available at the moment.</div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search by name, email, or specialization..."
                      className="w-full p-2.5 border rounded-md"
                    />
                    {Array.from(new Set(therapistList.flatMap(t => t.tags || []))).length > 0 && (
                      <select
                        value={specialization}
                        onChange={e => setSpecialization(e.target.value)}
                        className="w-full sm:w-56 p-2.5 border rounded-md"
                      >
                        <option value="">All specializations</option>
                        {Array.from(new Set(therapistList.flatMap(t => t.tags || []))).sort().map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {therapistList
                      .filter(t => {
                        const q = searchQuery.trim().toLowerCase();
                        const matchesQuery = !q ||
                          t.name.toLowerCase().includes(q) ||
                          (t.email && t.email.toLowerCase().includes(q)) ||
                          (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)));
                        const matchesSpec = !specialization ||
                          (t.tags && t.tags.includes(specialization));
                        return matchesQuery && matchesSpec;
                      })
                      .map(t => {
                        const isSelected = therapist && therapist.id === t.id;
                        const priceDisplay = t.price ? `₹${t.price.toLocaleString('en-IN')}` : 'Price on request';
                        return (
                          <button
                            key={t.id}
                            onClick={() => setTherapist(t)}
                            className={`text-left border rounded-xl p-4 hover:shadow-sm transition ${isSelected ? 'border-blue-600 bg-blue-50' : ''}`}
                            aria-pressed={isSelected}
                          >
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white grid place-items-center mb-2 flex-shrink-0 mx-auto">
                              {t.image ? (
                                <img src={t.image} alt={t.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <span className="text-lg font-semibold">
                                  {(t.name?.[0] || t.email?.[0] || 'T').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="font-semibold text-gray-900 mt-2">{t.name}</div>
                            {t.tags && t.tags.length > 0 && (
                              <div className="text-xs text-gray-600 mt-1">{t.tags.join(', ')}</div>
                            )}
                            <div className="text-sm text-gray-700 mt-2 font-medium">{priceDisplay}</div>
                            {t.phone && (
                              <div className="text-xs text-gray-500 mt-1">📞 {t.phone}</div>
                            )}
                          </button>
                        );
                      })}
                    {therapistList.filter(t => {
                      const q = searchQuery.trim().toLowerCase();
                      const matchesQuery = !q ||
                        t.name.toLowerCase().includes(q) ||
                        (t.email && t.email.toLowerCase().includes(q)) ||
                        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)));
                      const matchesSpec = !specialization ||
                        (t.tags && t.tags.includes(specialization));
                      return matchesQuery && matchesSpec;
                    }).length === 0 && (
                        <div className="col-span-full text-sm text-gray-600 text-center py-4">No counsellors match your search.</div>
                      )}
                  </div>
                </>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="font-semibold text-gray-900 mb-3">Select Date</div>
              <div className="w-full">
                <Calendar
                  onChange={setSelectedDate}
                  value={selectedDate}
                  minDate={new Date()}
                  className="w-full"
                />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="font-semibold text-gray-900 mb-3">Select Time</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {timeSlots.map(t => (
                  <TimeButton key={t} label={t} selected={selectedTime === t} onClick={() => setSelectedTime(t)} />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            {therapist && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white grid place-items-center flex-shrink-0">
                    {therapist.image ? (
                      <img src={therapist.image} alt={therapist.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-lg font-semibold">
                        {(therapist.name?.[0] || therapist.email?.[0] || 'T').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{therapist.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{therapist.email}</div>
                    {therapist.tags && therapist.tags.length > 0 && (
                      <div className="text-xs text-gray-600 mt-2">
                        <span className="font-medium">Specializations:</span> {therapist.tags.join(', ')}
                      </div>
                    )}
                    {therapist.price && (
                      <div className="text-sm text-gray-700 mt-2 font-medium">₹{therapist.price.toLocaleString('en-IN')} per session</div>
                    )}
                    {therapist.phone && (
                      <div className="text-xs text-gray-500 mt-1">📞 {therapist.phone}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="font-semibold text-gray-900">Booking Summary</div>
              <div className="mt-2 text-sm text-gray-700 space-y-1">
                <div><span className="text-gray-500">Counsellor:</span> {therapist?.name || 'Not selected'}</div>
                {therapist?.price && (
                  <div><span className="text-gray-500">Fee:</span> ₹{therapist.price.toLocaleString('en-IN')}</div>
                )}
                <div><span className="text-gray-500">Date:</span> {selectedDate ? format(selectedDate, 'PPP') : 'Not selected'}</div>
                <div><span className="text-gray-500">Time:</span> {selectedTime || 'Not selected'}</div>
              </div>
              <button onClick={handleConfirm} disabled={!therapist || !selectedDate || !selectedTime} className="w-full mt-4 bg-blue-600 text-white rounded-md py-2 disabled:bg-blue-300">Confirm Booking</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookAppointment;


