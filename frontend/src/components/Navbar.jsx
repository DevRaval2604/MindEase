import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useEffect, useState } from 'react';

function Navbar() {
  const { isAuthenticated, userType, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    return navigate.listen?.(() => setMobileOpen(false));
  }, [navigate]);
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  return (
    <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur border-b border-gray-200 text-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="font-semibold text-xl text-blue-700">
          <Link to="/">MindEase</Link>
        </div>
        <button
          aria-label="Toggle menu"
          className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mobileOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
        <div className="hidden lg:flex items-center gap-6 text-sm">
          {(!isAuthenticated || userType === 'client') && (
            <>
              <NavLink to="/" className={({ isActive }) => isActive ? 'text-blue-700' : 'hover:text-blue-700'}>Home</NavLink>
              <NavLink to="/resources" className={({ isActive }) => isActive ? 'text-blue-700' : 'hover:text-blue-700'}>Resources</NavLink>
              <NavLink to="/therapists" className={({ isActive }) => isActive ? 'text-blue-700' : 'hover:text-blue-700'}>Therapists</NavLink>
              {isAuthenticated && <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'text-blue-700' : 'hover:text-blue-700'}>Dashboard</NavLink>}
            </>
          )}
          {isAuthenticated && userType === 'counsellor' && (
            <NavLink to="/counsellor/dashboard" className={({ isActive }) => isActive ? 'text-blue-700' : 'hover:text-blue-700'}>Dashboard</NavLink>
          )}
          {!isAuthenticated ? (
            <>
              <NavLink to="/login" className={({ isActive }) => isActive ? 'text-blue-700' : 'hover:text-blue-700'}>Sign In</NavLink>
              <Link to="/register" className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700">Sign Up</Link>
            </>
          ) : (
            <button onClick={handleLogout} className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-black">Logout</button>
          )}
        </div>
      </div>
      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white/95 backdrop-blur">
          <div className="px-4 py-4 space-y-3 text-sm">
            {(!isAuthenticated || userType === 'client') && (
              <>
                <NavLink to="/" onClick={() => setMobileOpen(false)} className={({ isActive }) => `block ${isActive ? 'text-blue-700' : 'hover:text-blue-700'}`}>Home</NavLink>
                <NavLink to="/resources" onClick={() => setMobileOpen(false)} className={({ isActive }) => `block ${isActive ? 'text-blue-700' : 'hover:text-blue-700'}`}>Resources</NavLink>
                <NavLink to="/therapists" onClick={() => setMobileOpen(false)} className={({ isActive }) => `block ${isActive ? 'text-blue-700' : 'hover:text-blue-700'}`}>Therapists</NavLink>
                {isAuthenticated && (
                  <NavLink to="/dashboard" onClick={() => setMobileOpen(false)} className={({ isActive }) => `block ${isActive ? 'text-blue-700' : 'hover:text-blue-700'}`}>Dashboard</NavLink>
                )}
              </>
            )}
            {isAuthenticated && userType === 'counsellor' && (
              <NavLink to="/counsellor/dashboard" onClick={() => setMobileOpen(false)} className={({ isActive }) => `block ${isActive ? 'text-blue-700' : 'hover:text-blue-700'}`}>Dashboard</NavLink>
            )}
            {!isAuthenticated ? (
              <>
                <NavLink to="/login" onClick={() => setMobileOpen(false)} className={({ isActive }) => `block ${isActive ? 'text-blue-700' : 'hover:text-blue-700'}`}>Sign In</NavLink>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="inline-flex items-center justify-center w-full bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700">Sign Up</Link>
              </>
            ) : (
              <button onClick={handleLogout} className="inline-flex items-center justify-center w-full bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-black">Logout</button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;