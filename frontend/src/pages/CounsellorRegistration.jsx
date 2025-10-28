import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function CounsellorRegistration() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    accountType: 'Counsellor',
    licenseNumber: '',
    specialization: '',
    fees: '',
    availability: ''
  });

  useEffect(() => {
    const prefilled = location.state?.form;
    if (prefilled) {
      setForm(prev => ({
        ...prev,
        firstName: prefilled.firstName || prev.firstName,
        lastName: prefilled.lastName || prev.lastName,
        email: prefilled.email || prev.email,
        accountType: 'Counsellor',
      }));
    }
  }, [location.state]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = e => {
    e.preventDefault();
    try {
      const profile = {
        fullName: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        phone: form.phone || '',
        licenseNumber: form.licenseNumber,
        specialization: form.specialization,
        fees: form.fees,
        availability: form.availability,
        bio: '',
        avatar: '',
      };
      localStorage.setItem('counsellorProfile', JSON.stringify(profile));
      const users = JSON.parse(localStorage.getItem('auth:users') || '{}');
      users[form.email] = 'counsellor';
      localStorage.setItem('auth:users', JSON.stringify(users));
      console.log('Counsellor registered:', { email: form.email, users }); // Debug log
    } catch (_) { }
    login('counsellor');
    navigate('/counsellor/appointments');
  };

  return (
    <div className="py-10">
      <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <h2 className="text-2xl font-bold text-center">Register for SkillBridge</h2>
        <p className="text-sm text-center text-gray-600 mt-1">Create your account to connect with clients, counsellors, and administrators.</p>

        <div className="mt-8">
          <h3 className="font-semibold text-gray-900">Personal Details</h3>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">First Name</label>
              <input className="w-full p-2.5 border rounded-md" name="firstName" value={form.firstName} onChange={handleChange} required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Last Name</label>
              <input className="w-full p-2.5 border rounded-md" name="lastName" value={form.lastName} onChange={handleChange} required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Email</label>
              <input className="w-full p-2.5 border rounded-md" type="email" name="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Phone</label>
              <input className="w-full p-2.5 border rounded-md" name="phone" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Password</label>
              <input className="w-full p-2.5 border rounded-md" type="password" name="password" value={form.password} onChange={handleChange} required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Confirm Password</label>
              <input className="w-full p-2.5 border rounded-md" type="password" name="confirm" value={form.confirm} onChange={handleChange} required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Account Type</label>
              <select className="w-full p-2.5 border rounded-md" name="accountType" value={form.accountType} onChange={handleChange}>
                <option>Counsellor</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold text-gray-900">Professional Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">License Number</label>
              <input className="w-full p-2.5 border rounded-md" name="licenseNumber" placeholder="e.g., PSY12345" value={form.licenseNumber} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Specialization</label>
              <select className="w-full p-2.5 border rounded-md" name="specialization" value={form.specialization} onChange={handleChange}>
                <option value="">Select your specialization</option>
                <option>Anxiety</option>
                <option>Depression</option>
                <option>Relationship Counselling</option>
                <option>Grief Support</option>
                <option>Stress Management</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Fees (per hour)</label>
              <input className="w-full p-2.5 border rounded-md" name="fees" placeholder="e.g., 75" value={form.fees} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Availability</label>
              <select className="w-full p-2.5 border rounded-md" name="availability" value={form.availability} onChange={handleChange}>
                <option value="">Select your availability</option>
                <option>Weekdays</option>
                <option>Weekends</option>
                <option>Evenings</option>
              </select>
            </div>
          </div>

          <button className="w-full bg-blue-600 text-white py-2.5 rounded-md mt-2">Register</button>
          <p className="text-xs text-center text-gray-600 mt-2">Already have an account? <a href="/login" className="text-blue-600">Sign in</a></p>
        </form>
      </div>
    </div>
  );
}

export default CounsellorRegistration;


