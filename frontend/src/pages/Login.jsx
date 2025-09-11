import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = e => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('auth:users') || '{}');
    const role = users[form.email] || 'client';
    console.log('Login attempt:', { email: form.email, role, users }); // Debug log
    login(role);
    navigate(role === 'counsellor' ? '/counsellor/dashboard' : '/dashboard');
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
            <div>
              <label className="block text-sm text-gray-700 mb-1">Email</label>
              <input className="w-full p-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Password</label>
              <input className="w-full p-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" type="password" name="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
            </div>
            <button className="w-full bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-700" type="submit">Login</button>
          </div>
          <p className="text-xs text-center text-gray-600 mt-4">Don't have an account? <a href="/register" className="text-blue-600 hover:underline">Register</a></p>
        </form>
      </div>
    </div>
  );
}

export default Login;