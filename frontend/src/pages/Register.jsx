import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
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

  const handleSubmit = async e => {
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

    // Prepare payload for backend
    const payload = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone,
      role: form.accountType.toLowerCase(), // 'client' | 'counsellor'
      password: form.password,
      password2: form.confirm,
    };

    try {
      const res = await fetch(`${API_BASE}/api/auth/signup/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let detail = 'Registration failed';
        console.log(res)
        try {
          const data = await res.json();
          // Map backend field errors to our form fields when possible
          const fieldErrors = {};
          if (data.email) fieldErrors.email = Array.isArray(data.email) ? data.email[0] : String(data.email);
          if (data.first_name) fieldErrors.firstName = Array.isArray(data.first_name) ? data.first_name[0] : String(data.first_name);
          if (data.last_name) fieldErrors.lastName = Array.isArray(data.last_name) ? data.last_name[0] : String(data.last_name);
          if (data.phone) fieldErrors.phone = Array.isArray(data.phone) ? data.phone[0] : String(data.phone);
          if (data.role) fieldErrors.accountType = Array.isArray(data.role) ? data.role[0] : String(data.role);
          if (data.password) fieldErrors.password = Array.isArray(data.password) ? data.password[0] : String(data.password);
          if (data.password2) fieldErrors.confirm = Array.isArray(data.password2) ? data.password2[0] : String(data.password2);
          if (Object.keys(fieldErrors).length) setErrors(prev => ({ ...prev, ...fieldErrors }));
          if (data.detail) detail = String(data.detail);
        } catch (_) {
          const msg = await res.text();
          if (msg) detail = msg;
        }
        throw new Error(detail);
      }
      // Auto-login after successful registration
      const user = await login(form.email, form.password);
      const role = user?.role || payload.role || 'client';
      navigate(role === 'counsellor' ? '/counsellor/dashboard' : '/dashboard');
    } catch (err) {
      setErrors(prev => ({ ...prev, form: err.message || 'Registration failed. Please check your details.' }));
    }
  };

  return (
    <div className="py-10">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <h2 className="text-2xl font-bold text-center">Register for SkillBridge</h2>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* First & Last Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">First Name</label>
              <input className="w-full p-2.5 border rounded-md" name="firstName" value={form.firstName} onChange={handleChange} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Last Name</label>
              <input className="w-full p-2.5 border rounded-md" name="lastName" value={form.lastName} onChange={handleChange} required />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input className="w-full p-2.5 border rounded-md" type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm mb-1">Phone</label>
            <input
              className={`w-full p-2.5 border rounded-md ${touched.phone && errors.phone ? 'border-red-500' : ''}`}
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              maxLength="10"
              required
            />
            {touched.phone && errors.phone && (
              <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* Password + Confirm */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Password</label>
              <input
                className={`w-full p-2.5 border rounded-md ${touched.password && errors.password ? 'border-red-500' : ''}`}
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="text-xs mt-1 text-blue-500">
                {showPassword ? 'Hide' : 'Show'}
              </button>
              {touched.password && errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
            </div>
            <div>
              <label className="block text-sm mb-1">Confirm Password</label>
              <input
                className={`w-full p-2.5 border rounded-md ${touched.confirm && errors.confirm ? 'border-red-500' : ''}`}
                type={showConfirm ? 'text' : 'password'}
                name="confirm"
                value={form.confirm}
                onChange={handleChange}
                required
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-xs mt-1 text-blue-500">
                {showConfirm ? 'Hide' : 'Show'}
              </button>
              {touched.confirm && errors.confirm && <p className="text-xs text-red-600">{errors.confirm}</p>}
            </div>
          </div>

          {/* Account Type + Age Group */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Account Type</label>
              <select className="w-full p-2.5 border rounded-md" name="accountType" value={form.accountType} onChange={handleChange}>
                <option>Client</option>
                <option>Counsellor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Age Group</label>
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

          {/* Counsellor fields */}
          {form.accountType === 'Counsellor' && (
            <>
              <h3 className="font-semibold">Professional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className="w-full p-2.5 border rounded-md" name="licenseNumber" placeholder="License Number" value={form.licenseNumber} onChange={handleChange} />
                <select className="w-full p-2.5 border rounded-md" name="specialization" value={form.specialization} onChange={handleChange}>
                  <option value="">Select specialization</option>
                  <option>Anxiety</option>
                  <option>Depression</option>
                  <option>Relationship Counselling</option>
                  <option>Grief Support</option>
                  <option>Stress Management</option>
                </select>
                <input className="w-full p-2.5 border rounded-md" name="fees" placeholder="Fees (per hour)" value={form.fees} onChange={handleChange} />
                <select className="w-full p-2.5 border rounded-md" name="availability" value={form.availability} onChange={handleChange}>
                  <option value="">Select availability</option>
                  <option>Weekdays</option>
                  <option>Weekends</option>
                  <option>Evenings</option>
                </select>
              </div>
            </>
          )}

          {/* Terms */}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
            I agree to the <span className="text-blue-600">Terms and Privacy Policy</span>
          </label>
          {touched.agree && errors.agree && <p className="text-xs text-red-600">{errors.agree}</p>}

          {/* Submit */}
          <button disabled={!agree} className="w-full bg-blue-600 disabled:bg-blue-300 text-white py-2.5 rounded-md" type="submit">
            Register
          </button>
          {errors.form && (
            <p className="text-sm text-red-600 mt-2" role="alert">{errors.form}</p>
          )}
        </form>
      </div>
    </div>
  );
}

export default Register;
