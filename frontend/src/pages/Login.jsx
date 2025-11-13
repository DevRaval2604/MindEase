import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState(null); // 'success', 'error', null
  const [message, setMessage] = useState(''); // Success/error message
  const [isVerified, setIsVerified] = useState(false); // Track if email was just verified

  // Check if redirected from email verification (via state or URL param)
  useEffect(() => {
    // Check URL parameter (for cross-tab redirects)
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('verified') === 'true') {
      setMessage('Email verified successfully! You can now log in.');
      setIsVerified(true);
      // Remove the query parameter from URL
      window.history.replaceState({}, document.title, location.pathname);
    }
    // Check navigation state (for same-tab redirects)
    else if (location.state?.verified && location.state?.message) {
      setMessage(location.state.message);
      setIsVerified(true);
      // Clear the state so it doesn't show again on refresh
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location]);

  const validate = (values) => {
    const nextErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    if (!values.email) nextErrors.email = 'Email is required';
    else if (!emailRegex.test(values.email)) nextErrors.email = 'Enter a valid email';

    if (!values.password) nextErrors.password = 'Password is required';
    return nextErrors;
  };


  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleResendVerification = async () => {
    if (!form.email) {
      setErrors({ email: 'Please enter your email address first' });
      return;
    }

    setResendStatus('sending');
    setErrors({});
    setMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/auth/resend-verification/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: form.email }),
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        // If response is not JSON, get text
        const text = await response.text();
        console.error('Non-JSON response:', text);
        setResendStatus('error');
        setErrors({ form: 'Failed to resend verification email. Please try again.' });
        return;
      }
      
      console.log('Resend verification response:', response.status, data);
      
      if (response.ok) {
        // Check if email is already verified
        if (data.verified || data.detail?.toLowerCase().includes('already verified')) {
          setResendStatus('success');
          setErrors({});
          setMessage('Your email is already verified! You can log in now.');
          // Clear any verification errors
          setShowResendVerification(false);
        } else {
          setResendStatus('success');
          setErrors({});
          // Show success message
          setMessage(data.detail || 'Verification email sent! Please check your inbox (and spam folder).');
        }
      } else if (response.status === 429) {
        // Throttling error
        setResendStatus('error');
        setErrors({ form: data.detail || 'Too many requests. Please wait before trying again.' });
      } else {
        setResendStatus('error');
        setErrors({ form: data.detail || 'Failed to resend verification email' });
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setResendStatus('error');
      setErrors({ form: 'Failed to resend verification email. Please check your connection and try again.' });
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setTouched({ email: true, password: true });
    if (Object.keys(nextErrors).length > 0) return;

    try {
      const data = await login(form.email, form.password);
      const role = data?.role || 'client';
      navigate(role === 'counsellor' ? '/counsellor/dashboard' : '/dashboard');
    } catch (err) {
      const errorMessage = err?.message || '';
      // Check if error is due to unverified email
      // Backend returns: "Please verify your email before logging in."
      if (errorMessage.toLowerCase().includes('verify your email') || 
          errorMessage.toLowerCase().includes('please verify') ||
          errorMessage.toLowerCase().includes('email verification')) {
        setErrors({ form: errorMessage || 'Please verify your email before logging in. Check your inbox for the verification link.' });
        setShowResendVerification(true);
        setMessage(''); // Clear any previous messages
      } else {
        setErrors({ form: errorMessage || 'Invalid email or password' });
        setShowResendVerification(false);
        setMessage(''); // Clear any previous messages
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 md:p-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-sm text-gray-600 mt-2">Enter your details to log in.</p>
          </div>
          <div className="space-y-5">
            {/* Show verification success message from email verification (shown first) */}
            {isVerified && message && (
              <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-3">
                <p>{message}</p>
              </div>
            )}
            {errors.form && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3" role="alert">
                <p>{errors.form}</p>
                {showResendVerification && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendStatus === 'sending'}
                    className="mt-2 text-blue-600 hover:text-blue-800 underline text-xs disabled:opacity-50"
                  >
                    {resendStatus === 'sending' ? 'Sending...' : 'Resend verification email'}
                  </button>
                )}
              </div>
            )}
            {resendStatus === 'success' && !isVerified && (
              <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-3">
                <p>{message || 'Verification email sent! Please check your inbox (and spam folder) and click the verification link.'}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${touched.email && errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                aria-invalid={Boolean(touched.email && errors.email)}
                aria-describedby={touched.email && errors.email ? 'login-email-error' : undefined}
                required
              />
              {touched.email && errors.email && (
                <p id="login-email-error" className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  className={`w-full p-3 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${touched.password && errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  aria-invalid={Boolean(touched.password && errors.password)}
                  aria-describedby={touched.password && errors.password ? 'login-password-error' : undefined}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 inline-flex items-center justify-center text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.77 18.77 0 0 1 5.06-6.94" /><path d="M1 1l22 22" /><path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88" /><path d="M21 12s-3 8-9 8a10.94 10.94 0 0 1-5.06-2.06" /></svg>
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8S1 12 1 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              {touched.password && errors.password && (
                <p id="login-password-error" className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>
            <div className="pt-2">
              <button className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors font-medium text-base" type="submit">Login</button>
            </div>
          </div>
          <p className="text-sm text-center text-gray-600 mt-6">Don't have an account? <a href="/Register" className="text-blue-600 hover:text-blue-800 hover:underline font-medium">Register</a></p>
        </form>
      </div>
    </div>
  );
}

export default Login;