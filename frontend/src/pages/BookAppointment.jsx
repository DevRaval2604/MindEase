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

  // Fetch therapists from database only - no default data
  useEffect(() => {
    if (location.state?.therapist) {
    setLoadingTherapists(false);
    return;
    }

    const fetchTherapists = async () => {
      if (!isAuthenticated) {
        setTherapistList([]);
        setLoadingTherapists(false);
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
          console.log('BookAppointment: Fetched therapists from database:', data);

          // Only use data from database - no default/hardcoded therapists
          // Always transform if data is an array (even if empty)
          const transformed = Array.isArray(data) ? data.map(t => ({
            id: t.id,
            name: t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Therapist',
            email: t.email,
            phone: t.phone,
            image: t.profile_picture || '',
            tags: [],
            price: 0,
            originalData: t
          })) : [];

          console.log('BookAppointment: Transformed therapists:', transformed);
          setTherapistList(transformed);

          // If therapist was passed via location state, find and set it
          if (location.state?.therapist && transformed.length > 0) {
            const found = transformed.find(t => t.id === location.state.therapist.id || t.email === location.state.therapist.email);
            if (found) setTherapist(found);
          }
        } else {
          const errorText = await res.text();
          console.error('Failed to fetch therapists. Status:', res.status, 'Response:', errorText);
          // No default data - show empty list
          setTherapistList([]);
        }
      } catch (error) {
        console.error('Error fetching therapists:', error);
        // No default data - show empty list
        setTherapistList([]);
      } finally {
        setLoadingTherapists(false);
      }
    };

    fetchTherapists();
  }, [isAuthenticated, location.state]);

  // If a therapist was passed via location.state but only contains a minimal shape (like id),
  // try to fetch full details for that single therapist so we can show all fields.
  useEffect(() => {
    const passed = location.state?.therapist;
    if (!passed) return;

    // If we already have detailed data, skip fetching
    if (passed.originalData && Object.keys(passed.originalData).length > 0) return;

    const fetchOne = async (t) => {
      try {
        const id = t.id || t.user_id || null;
        if (!id) return;
        const res = await fetch(`${API_BASE}/api/auth/therapists/${id}/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();
        const transformed = {
          id: data.id,
          name: data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Therapist',
          email: data.email,
          phone: data.phone,
          image: data.profile_picture || '',
          tags: [],
          price: data.fees_per_session || 0,
          originalData: data,
        };
        setTherapist(transformed);
      } catch (err) {
        console.error('Error fetching single therapist details:', err);
      }
    };

    fetchOne(passed);
  }, [location.state]);

  function handleConfirm() {
    if (!selectedDate || !selectedTime) return;
    // Build a combined Date from selected date + time string
    const [time, meridiem] = selectedTime.split(' ');
    const [hhStr, mmStr] = time.split(':');
    let hours = parseInt(hhStr, 10);
    const minutes = parseInt(mmStr, 10);
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    const appointmentDate = new Date(selectedDate);
    appointmentDate.setHours(hours, minutes, 0, 0);

    // Build appointment data and navigate to the Payment page which will create the
    // appointment on the backend and initiate the payment flow.
    const appointmentData = {
      therapistId: therapist?.id,
      therapistName: therapist?.name || 'Therapist',
      therapistEmail: therapist?.email || '',
      clientId: user?.id,
      clientName: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Client',
      clientEmail: user?.email || '',
      clientPhone: user?.phone || '',
      tags: therapist?.tags || [],
      datetimeIso: appointmentDate.toISOString(),
      notes: '',
      duration_minutes: 60,
    };

    // Navigate to the payment page and pass appointmentData via location.state
    navigate('/appointments/payment', { state: { appointmentData } });
  }
  return (
    <div className="flex h-screen">
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Book Appointment</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              {therapist ? (
                <>
                  <div className="font-semibold text-gray-900 mb-3">Selected Therapist</div>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white grid place-items-center flex-shrink-0">
                      {therapist.image ? (
                        <img src={therapist.image} alt={therapist.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-lg font-semibold">
                          {(therapist.name?.[0] || therapist.email?.[0] || "T").toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900">{therapist.name}</div>
                        <div className="text-sm text-gray-600">{therapist.email}</div>
                        {therapist.phone && <div className="text-xs text-gray-500">📞 {therapist.phone}</div>}

                        {/* Detailed profile fields if available */}
                        {therapist.originalData && (
                          <div className="mt-2 space-y-1 text-xs text-gray-500">
                            {therapist.originalData.fees_per_session && (
                              <div>💰 Fees per session: ₹{therapist.originalData.fees_per_session}</div>
                            )}
                            {therapist.originalData.license_number && (
                              <div>🧾 License: {therapist.originalData.license_number}</div>
                            )}
                            {therapist.originalData.experience && (
                              <div>📚 Experience: {therapist.originalData.experience}</div>
                            )}
                            {therapist.originalData.specializations?.length > 0 && (
                              <div>🧠 Specializations: {therapist.originalData.specializations.map(s => s.name).join(', ')}</div>
                            )}
                            {therapist.originalData.availability?.length > 0 && (
                              <div>⏰ Availability: {therapist.originalData.availability.map(a => a.name || a).join(', ')}</div>
                            )}
                            <div>✅ Verified professional: {therapist.originalData.is_verified_professional ? 'Yes' : 'No'}</div>
                          </div>
                        )}
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                          placeholder="Search by name or email..."
                          className="w-full p-2.5 border rounded-md"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {therapistList
                          .filter(t => {
                            const q = searchQuery.trim().toLowerCase();
                            return !q || t.name.toLowerCase().includes(q) || (t.email && t.email.toLowerCase().includes(q));
                          })
                          .map(t => {
                            const isSelected = therapist && therapist.id === t.id;
                            return (
                              <button
                                key={t.id}
                                onClick={() => setTherapist(t)}
                                className={`text-left border rounded-xl p-4 hover:shadow-sm ${
                                  isSelected ? "border-blue-600 bg-blue-50" : ""
                                }`}
                                aria-pressed={isSelected}
                              >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white grid place-items-center mb-2 flex-shrink-0 mx-auto">
                                  {t.image ? (
                                    <img src={t.image} alt={t.name} className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    <span className="text-lg font-semibold">
                                      {(t.name?.[0] || t.email?.[0] || "T").toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="font-semibold text-gray-900 mt-2">{t.name}</div>
                                <div className="text-xs text-gray-600 mt-1 truncate">{t.email}</div>
                                {t.phone && <div className="text-xs text-gray-500 mt-1">📞 {t.phone}</div>}
                              </button>
                            );
                          })}
                      </div>
                    </>
                  )}
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
                  <div>
                    <div className="font-semibold text-gray-900">{therapist.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{therapist.email}</div>
                    {therapist.phone && (
                      <div className="text-xs text-gray-500 mt-1">📞 {therapist.phone}</div>
                    )}
                    {therapist.originalData && (
                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        {therapist.originalData.experience && (
                          <div>📚 {therapist.originalData.experience}</div>
                        )}
                        {therapist.originalData.fees_per_session && (
                          <div>💰 Fees: ₹{therapist.originalData.fees_per_session}</div>
                        )}
                        {therapist.originalData.specializations?.length > 0 && (
                          <div>🧠 {therapist.originalData.specializations.map(s => s.name).join(', ')}</div>
                        )}
                        {therapist.originalData.availability?.length > 0 && (
                          <div>⏰ {therapist.originalData.availability.map(a => a.name || a).join(', ')}</div>
                        )}
                        <div>✅ Verified: {therapist.originalData.is_verified_professional ? 'Yes' : 'No'}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="font-semibold text-gray-900">Booking Summary</div>
              <div className="mt-2 text-sm text-gray-700 space-y-1">
                <div><span className="text-gray-500">Therapist:</span> {therapist?.name || 'Not selected'}</div>
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


