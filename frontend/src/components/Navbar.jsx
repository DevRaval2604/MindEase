import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Navbar() {
  const { isAuthenticated, userType, logout } = useAuth();
  const navigate = useNavigate();
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
        <div className="flex items-center gap-6 text-sm">
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
    </nav>
  );
}

export default Navbar;