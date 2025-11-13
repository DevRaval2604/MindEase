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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

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
    // Backend expects phone as string of exactly 10 digits
    const phoneNumber = form.phone.trim().replace(/\D/g, ''); // Remove all non-digits
    if (phoneNumber.length !== 10) {
      setErrors(prev => ({ ...prev, phone: 'Phone must be exactly 10 digits' }));
      return;
    }

    const payload = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: phoneNumber, // Backend expects exactly 10 digits as string
      account_type: form.accountType.toLowerCase(), // Backend uses 'account_type' not 'role'
      password: form.password,
      confirm_password: form.confirm, // Backend expects 'confirm_password' not 'password2'
      agreed_terms: agree, // Backend requires agreed_terms field
    };

    // Add client-specific fields (age_group mapping)
    if (form.accountType.toLowerCase() === 'client') {
      // Map frontend age group labels to backend values
      const ageGroupMap = {
        'Under 18': 'under_18',
        '18-25': '18_25',
        '26-40': '26_40',
        '41-60': '41_60',
        '60+': '60_plus',
      };
      const ageGroupValue = ageGroupMap[form.ageGroup];
      if (ageGroupValue) {
        payload.age_group = ageGroupValue;
      }
    }

    // Add counsellor-specific fields if role is counsellor
    if (form.accountType === 'Counsellor') {
      payload.license_number = form.licenseNumber.trim() || null;

      // Backend expects specializations as list of integers (IDs), not a string
      // Mapped to actual database IDs from Specialization table
      const specializationMap = {
        'Anxiety': 1,                    // ID: 1
        'Depression': 2,                  // ID: 2 (Note: DB has "Deptression" typo)
        'Relationship Counselling': 3,    // ID: 3
        // 'Grief Support': 4,            // Not in database
        // 'Stress Management': 5,        // Not in database (ID 5 is "CBT")
      };
      const specializationId = specializationMap[form.specialization];

      if (!specializationId && form.specialization) {
        setErrors(prev => ({
          ...prev,
          specialization: `Specialization "${form.specialization}" not found. Please contact support or check database IDs.`
        }));
        return;
      }

      payload.specializations = specializationId ? [specializationId] : [];
      if (payload.specializations.length === 0) {
        setErrors(prev => ({ ...prev, specialization: 'Please select a specialization' }));
        return;
      }

      // Backend uses 'fees_per_session' not 'fees'
      const feesValue = parseFloat(form.fees);
      if (isNaN(feesValue) || feesValue <= 0) {
        setErrors(prev => ({ ...prev, fees: 'Please enter a valid fee amount' }));
        return;
      }
      payload.fees_per_session = feesValue;

      // Backend expects availability as a list of integers (IDs)
      // Mapped to actual database IDs from AvailabilitySlot table
      const availabilityMap = {
        'Weekdays': 2,    // ID: 2, Name: weekdays
        'Weekends': 1,    // ID: 1, Name: weekends
        'Evenings': 3,    // ID: 3, Name: evenings
        // 'Morning': 4,   // ID: 4, Name: morning (not in frontend options)
      };
      const availabilityId = availabilityMap[form.availability];

      if (!availabilityId && form.availability) {
        setErrors(prev => ({
          ...prev,
          availability: `Availability "${form.availability}" not found. Please contact support or check database IDs.`
        }));
        return;
      }

      payload.availability = availabilityId ? [availabilityId] : [];
      if (payload.availability.length === 0) {
        setErrors(prev => ({ ...prev, availability: 'Please select availability' }));
        return;
      }
    }

    // Log payload for debugging (remove in production)
    console.log('Registration payload:', JSON.stringify({ ...payload, password: '***', confirm_password: '***' }, null, 2));

    try {
      let res;
      try {
        res = await fetch(`${API_BASE}/api/auth/signup/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      } catch (fetchError) {
        // Handle network errors (connection refused, etc.)
        console.error('Network error:', fetchError);
        if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('ERR_CONNECTION_REFUSED')) {
          setErrors(prev => ({ 
            ...prev, 
            form: 'Cannot connect to server. Please ensure the backend server is running on http://localhost:8000' 
          }));
          return;
        }
        throw fetchError;
      }

      let responseData;
      try {
        responseData = await res.json(); // Parse response once
      } catch (parseError) {
        // If response is not JSON, it might be an error page
        const text = await res.text();
        console.error('Non-JSON response:', text);
        setErrors(prev => ({ 
          ...prev, 
          form: `Server error: ${res.status} ${res.statusText}. Please check the backend server.` 
        }));
        return;
      }

      if (!res.ok) {
        let detail = 'Registration failed';
        try {
          console.error('Registration error response:', JSON.stringify(responseData, null, 2));

          // Map backend field errors to our form fields when possible
          const fieldErrors = {};

          // Handle non-field errors first
          if (responseData.detail) {
            detail = String(responseData.detail);
          }

          // Map all field errors
          Object.keys(responseData).forEach(key => {
            if (key === 'detail') return; // Skip detail, already handled

            const errorValue = responseData[key];
            let errorMessage = '';

            if (Array.isArray(errorValue)) {
              errorMessage = errorValue[0];
            } else if (typeof errorValue === 'object' && errorValue !== null) {
              // Handle nested error objects
              errorMessage = JSON.stringify(errorValue);
            } else {
              errorMessage = String(errorValue);
            }

            // Map backend field names to frontend field names
            const fieldMap = {
              'email': 'email',
              'first_name': 'firstName',
              'last_name': 'lastName',
              'phone': 'phone',
              'role': 'accountType',
              'account_type': 'accountType', // Backend uses account_type
              'password': 'password',
              // 'password2': 'confirm',
              'confirm_password': 'confirm', // Backend uses confirm_password
              'agreed_terms': 'agree', // Backend uses agreed_terms
              'license_number': 'licenseNumber',
              'specialization': 'specialization',
              'specializations': 'specialization', // Backend uses specializations (plural, array)
              'fees': 'fees',
              'fees_per_session': 'fees', // Backend uses fees_per_session
              'availability': 'availability',
            };

            const frontendField = fieldMap[key] || key;
            fieldErrors[frontendField] = errorMessage;
          });

          // Set all errors at once
          if (Object.keys(fieldErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...fieldErrors }));
            // Update touched state for all fields with errors
            const touchedFields = {};
            Object.keys(fieldErrors).forEach(field => {
              touchedFields[field] = true;
              // Map 'agree' back to 'agree' for the checkbox
              if (field === 'agree') {
                touchedFields.agree = true;
              }
            });
            setTouched(prev => ({ ...prev, ...touchedFields }));

            if (!detail || detail === 'Registration failed') {
              detail = 'Please correct the errors below';
            }
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          // Response already parsed above, so this shouldn't happen
          detail = 'Registration failed. Please try again.';
        }
        throw new Error(detail);
      }

      // Registration successful - show success modal
      setRegisteredEmail(form.email);
      setShowSuccessModal(true);
      
      // Reset form
      setForm({
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
      setAgree(false);
      setErrors({});
      setTouched({});
    } catch (err) {
      setErrors(prev => ({ ...prev, form: err.message || 'Registration failed. Please check your details.' }));
    }
  };

  return (
    <div className="py-10">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <h2 className="text-2xl font-bold text-center">Register for Mindease</h2>
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

          {/* Account Type */}
          <div>
            <label className="block text-sm mb-1">Account Type</label>
            <select className="w-full p-2.5 border rounded-md" name="accountType" value={form.accountType} onChange={handleChange}>
              <option>Client</option>
              <option>Counsellor</option>
            </select>
          </div>

          {/* Age Group - Only show for Client */}
          {form.accountType === 'Client' && (
            <div>
              <label className="block text-sm mb-1">Age Group</label>
              <select 
                className="w-full p-2.5 border rounded-md" 
                name="ageGroup" 
                value={form.ageGroup} 
                onChange={handleChange}
              >
                <option value="">Select age group</option>
                <option>Under 18</option>
                <option>18-25</option>
                <option>26-40</option>
                <option>41-60</option>
                <option>60+</option>
              </select>
              {touched.ageGroup && errors.ageGroup && (
                <p className="mt-1 text-xs text-red-600">{errors.ageGroup}</p>
              )}
            </div>
          )}

          {/* Counsellor fields */}
          {form.accountType === 'Counsellor' && (
            <>
              <h3 className="font-semibold">Professional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    className={`w-full p-2.5 border rounded-md ${touched.licenseNumber && errors.licenseNumber ? 'border-red-500' : ''}`}
                    name="licenseNumber"
                    placeholder="License Number"
                    value={form.licenseNumber}
                    onChange={handleChange}
                    onBlur={() => setTouched(prev => ({ ...prev, licenseNumber: true }))}
                  />
                  {touched.licenseNumber && errors.licenseNumber && (
                    <p className="mt-1 text-xs text-red-600">{errors.licenseNumber}</p>
                  )}
                </div>
                <div>
                  <select
                    className={`w-full p-2.5 border rounded-md ${touched.specialization && errors.specialization ? 'border-red-500' : ''}`}
                    name="specialization"
                    value={form.specialization}
                    onChange={handleChange}
                    onBlur={() => setTouched(prev => ({ ...prev, specialization: true }))}
                  >
                    <option value="">Select specialization</option>
                    <option>Anxiety</option>
                    <option>Depression</option>
                    <option>Relationship Counselling</option>
                    {/* Note: Grief Support and Stress Management not available in database */}
                  </select>
                  {touched.specialization && errors.specialization && (
                    <p className="mt-1 text-xs text-red-600">{errors.specialization}</p>
                  )}
                </div>
                <div>
                  <input
                    className={`w-full p-2.5 border rounded-md ${touched.fees && errors.fees ? 'border-red-500' : ''}`}
                    name="fees"
                    placeholder="Fees (per hour)"
                    value={form.fees}
                    onChange={handleChange}
                    onBlur={() => setTouched(prev => ({ ...prev, fees: true }))}
                  />
                  {touched.fees && errors.fees && (
                    <p className="mt-1 text-xs text-red-600">{errors.fees}</p>
                  )}
                </div>
                <div>
                  <select
                    className={`w-full p-2.5 border rounded-md ${touched.availability && errors.availability ? 'border-red-500' : ''}`}
                    name="availability"
                    value={form.availability}
                    onChange={handleChange}
                    onBlur={() => setTouched(prev => ({ ...prev, availability: true }))}
                  >
                    <option value="">Select availability</option>
                    <option>Weekdays</option>
                    <option>Weekends</option>
                    <option>Evenings</option>
                  </select>
                  {touched.availability && errors.availability && (
                    <p className="mt-1 text-xs text-red-600">{errors.availability}</p>
                  )}
                </div>
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

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
              <p className="text-gray-600 mb-4">
                Please check your email at <span className="font-semibold">{registeredEmail}</span> to verify your account.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                We've sent a verification link to your email. Click the link to activate your account.
              </p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/login');
                }}
                className="w-full bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Register;
