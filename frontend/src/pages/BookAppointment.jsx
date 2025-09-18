import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Calendar from 'react-calendar';
import { format } from 'date-fns';
import 'react-calendar/dist/Calendar.css';
import { therapists as therapistList } from './TherapistDirectory';

function TimeButton({ label, selected, onClick }) {
  const base = "px-4 py-2 rounded-md border text-sm";
  const selectedClasses = selected ? " bg-blue-600 text-white border-blue-600" : " hover:bg-gray-50";
  return <button onClick={onClick} className={base + selectedClasses}>{label}</button>;
}

function BookAppointment() {
  const location = useLocation();
  const navigate = useNavigate();
  const [therapist, setTherapist] = useState(location.state?.therapist || null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [specialization, setSpecialization] = useState('');
  const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'];

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

    const newAppointment = {
      id: Date.now(),
      therapistName: therapist?.name || 'Therapist',
      tags: therapist?.tags || [],
      datetimeIso: appointmentDate.toISOString(),
      status: 'confirmed',
    };

    try {
      const existing = JSON.parse(localStorage.getItem('appointments') || '[]');
      existing.push(newAppointment);
      localStorage.setItem('appointments', JSON.stringify(existing));
    } catch (_) { }

    alert("Appointment booked successfully!");
    navigate('/dashboard');
  }
  return (
    <div className="flex h-screen">
      <aside className="w-60 shrink-0 border-r border-gray-200 p-4 hidden md:block sticky top-0 h-screen overflow-y-auto">
        <div className="font-semibold text-gray-900 mb-4">MindEase</div>
        <nav className="space-y-2 text-sm">
          <a className="block px-3 py-2 rounded-md hover:bg-gray-50" href="/dashboard">Dashboard</a>
          <a className="block px-3 py-2 rounded-md bg-blue-50 text-blue-700" href="/appointments/book">Appointments</a>
          <a className="block px-3 py-2 rounded-md hover:bg-gray-50" href="/profile">Profile</a>
          <a className="block px-3 py-2 rounded-md hover:bg-gray-50" href="#">Settings</a>
        </nav>
      </aside>
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Book Appointment</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="font-semibold text-gray-900 mb-3">Select Therapist</div>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name or specialization..."
                  className="w-full p-2.5 border rounded-md"
                />
                <select
                  value={specialization}
                  onChange={e => setSpecialization(e.target.value)}
                  className="w-full sm:w-56 p-2.5 border rounded-md"
                >
                  <option value="">All specializations</option>
                  {Array.from(new Set(therapistList.flatMap(t => t.tags))).sort().map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {therapistList
                  .filter(t => {
                    const q = searchQuery.trim().toLowerCase();
                    const matchesQuery = !q || t.name.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q));
                    const matchesSpec = !specialization || t.tags.includes(specialization);
                    return matchesQuery && matchesSpec;
                  })
                  .map(t => {
                    const isSelected = therapist && therapist.name === t.name;
                    return (
                      <button
                        key={t.name}
                        onClick={() => setTherapist(t)}
                        className={`text-left border rounded-xl p-4 hover:shadow-sm ${isSelected ? 'border-blue-600 bg-blue-50' : ''}`}
                        aria-pressed={isSelected}
                      >
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${t.color} text-white grid place-items-center mb-2`}>👤</div>
                        <div className="font-semibold text-gray-900">{t.name}</div>
                        <div className="text-xs text-gray-600 mt-1">{t.tags.join(', ')}</div>
                        <div className="text-sm text-gray-700 mt-2">{t.price}</div>
                      </button>
                    );
                  })}
                {therapistList.filter(t => {
                  const q = searchQuery.trim().toLowerCase();
                  const matchesQuery = !q || t.name.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q));
                  const matchesSpec = !specialization || t.tags.includes(specialization);
                  return matchesQuery && matchesSpec;
                }).length === 0 && (
                    <div className="col-span-full text-sm text-gray-600">No therapists match your search.</div>
                  )}
              </div>
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
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-400 grid place-items-center">👤</div>
                <div>
                  <div className="font-semibold text-gray-900">{therapist?.name || 'Select a therapist'}</div>
                  <div className="text-xs text-gray-600">{therapist ? therapist.tags.join(', ') : 'Specialization not selected'}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="font-semibold text-gray-900">About</div>
                <p className="text-sm text-gray-600 mt-1">With a compassionate and client-centered approach, Dr. Shefali creates a supportive environment for personal growth.</p>
              </div>
              <div className="mt-4">
                <div className="font-semibold text-gray-900">Experience</div>
                <p className="text-sm text-gray-600 mt-1">Over 10 years of practice using evidence-based techniques.</p>
              </div>
            </div>
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


