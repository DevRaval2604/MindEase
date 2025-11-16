import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const validate = (values) => {
    const nextErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    if (!values.email) nextErrors.email = 'Email is required';
    else if (!emailRegex.test(values.email)) nextErrors.email = 'Enter a valid email';

    if (!values.password) nextErrors.password = 'Password is required';
    return nextErrors;
  };


  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setTouched({ email: true, password: true });
  
    if (Object.keys(nextErrors).length > 0) return;
  
    try {
      const data = await login(form.email, form.password);
      const role = data?.role || "client";
      navigate(role === "counsellor" ? "/counsellor/dashboard" : "/dashboard");
  
    } catch (err) {
      console.log("ERROR FULL:", err);                // 👈 log everything
      console.log("ERROR RESPONSE:", err.response);   // 👈 log response
      console.log("ERROR REQUEST:", err.request);     // 👈 log request

      const backendMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        err?.response?.data?.message ||
        "Something went wrong";
    
      setErrors({ form: backendMessage });
    }
    
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[80vh]">
      <div className="hidden md:block relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1531379410502-63bfe8cdaf5b?q=80&w=1470&auto=format&fit=crop')] bg-cover bg-center opacity-30" />
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm w-full max-w-md p-8">
          <h2 className="text-xl font-semibold text-center">Welcome Back</h2>
          <p className="text-sm text-center text-gray-600 mt-1">Enter your details to log in.</p>
          <div className="mt-6 space-y-4">
            {errors.form && (
              <p className="text-sm text-red-600" role="alert">{errors.form}</p>
            )}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Email</label>
              <input
                className={`w-full p-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${touched.email && errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
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
              <label className="block text-sm text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  className={`w-full p-2.5 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${touched.password && errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
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
                  className="absolute inset-y-0 right-2 inline-flex items-center justify-center px-1.5 text-gray-500 hover:text-gray-700"
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
              {/* <input className="w-full p-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required /> */}
            </div>
            {/* <div>
              <label className="block text-sm text-gray-700 mb-1">Password</label>
              <input className="w-full p-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" type="password" name="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
            </div> */}
            <button className="w-full bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-700" type="submit">Login</button>
          </div>
          <p className="text-xs text-center text-gray-600 mt-4">Don't have an account? <a href="/Register" className="text-blue-600 hover:underline">Register</a></p>
        </form>
      </div>
    </div>
  );
}

export default Login;