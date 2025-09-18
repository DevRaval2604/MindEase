import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirm: '',
    accountType: 'Client',
    ageGroup: '',
    phone: '',
    licenseNumber: '',
    specialization: '',
    fees: '',
    availability: ''
  });
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = e => {
    const { name, value } = e.target;
    if (name === 'phone') {
      // Only allow digits and limit to 10 characters
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length <= 10) {
        setForm({ ...form, [name]: digitsOnly });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const validate = (values) => {
    const nextErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    if (!values.firstName) nextErrors.firstName = 'First name is required';
    if (!values.lastName) nextErrors.lastName = 'Last name is required';
    if (!values.email) nextErrors.email = 'Email is required';
    else if (!emailRegex.test(values.email)) nextErrors.email = 'Enter a valid email';
    if (!values.phone) nextErrors.phone = 'Phone is required';
    else if (values.phone.length < 10) nextErrors.phone = 'Phone must be 10 digits';
    if (!values.password) nextErrors.password = 'Password is required';
    else if (values.password.length < 6) nextErrors.password = 'Use at least 6 characters';
    if (!values.confirm) nextErrors.confirm = 'Confirm your password';
    else if (values.confirm !== values.password) nextErrors.confirm = 'Passwords do not match';

    if (values.accountType === 'Counsellor') {
      if (!values.licenseNumber) nextErrors.licenseNumber = 'License is required';
      if (!values.specialization) nextErrors.specialization = 'Select a specialization';
      if (!values.fees) nextErrors.fees = 'Fees are required';
      else if (isNaN(Number(values.fees))) nextErrors.fees = 'Enter a number';
      if (!values.availability) nextErrors.availability = 'Select availability';
    }
    if (!agree) nextErrors.agree = 'You must accept terms to continue';
    return nextErrors;
  };

  const handleSubmit = e => {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirm: true,
      phone: true,
      licenseNumber: true,
      specialization: true,
      fees: true,
      availability: true,
      agree: true,
    });
    if (Object.keys(nextErrors).length > 0) return;
    if (form.accountType === 'Client') {
      try {
        const initialProfile = {
          fullName: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          phone: form.phone || '',
          gender: '',
          dob: '',
          about: '',
          avatar: '',
          ageGroup: form.ageGroup || '',
        };
        localStorage.setItem('clientProfile', JSON.stringify(initialProfile));
        const users = JSON.parse(localStorage.getItem('auth:users') || '{}');
        users[form.email] = 'client';
        localStorage.setItem('auth:users', JSON.stringify(users));
      } catch (_) { }
      login('client');
      navigate('/dashboard');
    } else {
      // Handle counsellor registration inline
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
      } catch (error) {
        console.error('Error saving counsellor profile:', error);
      }
      login('counsellor');
      navigate('/');
    }
  };

  return (
    <div className="py-10">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <h2 className="text-2xl font-bold text-center">Register for SkillBridge</h2>
        <p className="text-sm text-center text-gray-600 mt-1">Create your account to connect with clients, counsellors, and administrators.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">First Name</label>
              <input className="w-full p-2.5 border rounded-md" name="firstName" value={form.firstName} onChange={handleChange} required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Last Name</label>
              <input className="w-full p-2.5 border rounded-md" name="lastName" value={form.lastName} onChange={handleChange} required />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input className="w-full p-2.5 border rounded-md" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Phone Number</label>
            <input
              className={`w-full p-2.5 border rounded-md ${touched.phone && errors.phone ? 'border-red-500' : ''}`}
              type="tel"
              name="phone"
              placeholder="9876543210"
              value={form.phone}
              onChange={handleChange}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              aria-invalid={Boolean(touched.phone && errors.phone)}
              aria-describedby={touched.phone && errors.phone ? 'reg-phone-error' : undefined}
              maxLength="10"
              required
            />
            {touched.phone && errors.phone && (
              <p id="reg-phone-error" className="mt-1 text-xs text-red-600">{errors.phone}</p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  className={`w-full p-2.5 pr-10 border rounded-md ${touched.password && errors.password ? 'border-red-500' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  aria-invalid={Boolean(touched.password && errors.password)}
                  aria-describedby={touched.password && errors.password ? 'reg-password-error' : undefined}
                  required
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-2 inline-flex items-center justify-center px-1.5 text-gray-500 hover:text-gray-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.77 18.77 0 0 1 5.06-6.94"/><path d="M1 1l22 22"/><path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88"/><path d="M21 12s-3 8-9 8a10.94 10.94 0 0 1-5.06-2.06"/></svg>
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {touched.password && errors.password && (
                <p id="reg-password-error" className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  className={`w-full p-2.5 pr-10 border rounded-md ${touched.confirm && errors.confirm ? 'border-red-500' : ''}`}
                  type={showConfirm ? 'text' : 'password'}
                  name="confirm"
                  value={form.confirm}
                  onChange={handleChange}
                  onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                  aria-invalid={Boolean(touched.confirm && errors.confirm)}
                  aria-describedby={touched.confirm && errors.confirm ? 'reg-confirm-error' : undefined}
                  required
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute inset-y-0 right-2 inline-flex items-center justify-center px-1.5 text-gray-500 hover:text-gray-700" aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}>
                  {showConfirm ? (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.77 18.77 0 0 1 5.06-6.94"/><path d="M1 1l22 22"/><path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88"/><path d="M21 12s-3 8-9 8a10.94 10.94 0 0 1-5.06-2.06"/></svg>
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {touched.confirm && errors.confirm && (
                <p id="reg-confirm-error" className="mt-1 text-xs text-red-600">{errors.confirm}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Account Type</label>
              <select className="w-full p-2.5 border rounded-md" name="accountType" value={form.accountType} onChange={handleChange}>
                <option>Client</option>
                <option>Counsellor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Age Group</label>
              <select className="w-full p-2.5 border rounded-md" name="ageGroup" value={form.ageGroup} onChange={handleChange}>
                <option value="">Select age group</option>
                <option>Under 18</option>
                <option>18-25</option>
                <option>26-40</option>
                <option>41-60</option>
                <option>60+</option>
              </select>
            </div>
          </div>

          {/* Counsellor-specific fields */}
          {form.accountType === 'Counsellor' && (
            <>
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
            </>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" className="rounded" checked={agree} onChange={e => setAgree(e.target.checked)} />
            I agree to the <span className="text-blue-600">Terms and Privacy Policy</span>
          </label>
          {touched.agree && errors.agree && (
            <p className="mt-1 text-xs text-red-600">{errors.agree}</p>
          )}
          <button disabled={!agree} className="w-full bg-blue-600 disabled:bg-blue-300 text-white py-2.5 rounded-md" type="submit">Register</button>
          <p className="text-xs text-center text-gray-600">Already have an account? <a href="/login" className="text-blue-600">Log in</a></p>
        </form>
      </div>
    </div>
  );
}

export default Register;